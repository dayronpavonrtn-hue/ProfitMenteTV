#!/usr/bin/env python3
"""Fail closed on malformed project containers before local render code consumes them."""
import json
import pathlib
import sys


def _identity(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (str, int, float)):
        text = str(value).strip()
        return text or None
    return None


def inspect(project):
    issues = []
    if not isinstance(project, dict):
        return ['El proyecto debe ser un objeto JSON.']

    clips = project.get('clips', [])
    assets = project.get('assets', [])
    if not isinstance(clips, list):
        issues.append('clips debe ser una lista.')
        clips = []
    if not isinstance(assets, list):
        issues.append('assets debe ser una lista.')
        assets = []

    clip_ids = set()
    for index, clip in enumerate(clips):
        if not isinstance(clip, dict):
            issues.append(f'Clip {index}: estructura inválida; se esperaba un objeto.')
            continue
        if 'id' in clip:
            cid = _identity(clip.get('id'))
            if cid is None:
                issues.append(f'Clip {index}: id inválido.')
            elif cid in clip_ids:
                issues.append(f'Clip {index}: id duplicado {cid!r}.')
            else:
                clip_ids.add(cid)

    asset_ids = set()
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            issues.append(f'Asset {index}: estructura inválida; se esperaba un objeto.')
            continue
        aid = _identity(asset.get('id'))
        if aid is None:
            issues.append(f'Asset {index}: id inválido.')
        elif aid in asset_ids:
            issues.append(f'Asset {index}: id duplicado {aid!r}; el render no puede elegir un archivo de forma segura.')
        else:
            asset_ids.add(aid)
        name = asset.get('name')
        if not isinstance(name, str) or not name.strip():
            issues.append(f'Asset {index}: nombre de archivo inválido.')

    return issues


def main(path):
    try:
        project = json.loads(pathlib.Path(path).read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        print(f'Project structure preflight FAILED: {exc}', file=sys.stderr)
        return 2
    issues = inspect(project)
    if issues:
        print('Project structure preflight FAILED', file=sys.stderr)
        for issue in issues:
            print(f'- {issue}', file=sys.stderr)
        return 2
    print('Project structure preflight OK')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: project_structure_preflight.py project.json')
    raise SystemExit(main(sys.argv[1]))
