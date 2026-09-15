#!/usr/bin/env python3
"""Fail closed on malformed project containers before local render code consumes them."""
import json
import pathlib
import sys

from media_identity import media_id_key


def _identity(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (str, int, float)):
        text = str(value).strip()
        return text or None
    return None


def _safe_asset_name(value):
    if not isinstance(value, str):
        return None
    name = value.strip()
    if not name or name in ('.', '..'):
        return None
    if '/' in name or '\\' in name or '\x00' in name:
        return None
    return name


def _validate_state_flags(project, issues):
    """Keep persisted editor flags unambiguous across JS and Python.

    Only real JSON booleans are accepted. In Python bool('false') is True, so
    accepting string flags could hide/mute content during MP4 render even though
    Studio preview treats the imported value as invalid/non-boolean.
    """
    flags = ('hidden', 'muted', 'solo', 'locked')
    for field in ('trackState', 'trackStates'):
        states = project.get(field)
        if states is None:
            continue
        if not isinstance(states, dict):
            issues.append(f'{field} debe ser un objeto.')
            continue
        for track, state in states.items():
            if not isinstance(state, dict):
                issues.append(f'{field}[{track}] debe ser un objeto.')
                continue
            for flag in flags:
                if flag in state and not isinstance(state[flag], bool):
                    issues.append(f'{field}[{track}].{flag} debe ser booleano JSON.')


def inspect(project):
    issues = []
    if not isinstance(project, dict):
        return ['El proyecto debe ser un objeto JSON.']

    _validate_state_flags(project, issues)
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
        for flag in ('muted', 'disabled', 'flipX', 'flipY'):
            if flag in clip and not isinstance(clip[flag], bool):
                issues.append(f'Clip {index}: {flag} debe ser booleano JSON.')
        if 'id' in clip:
            cid = _identity(clip.get('id'))
            if cid is None:
                issues.append(f'Clip {index}: id inválido.')
            elif cid in clip_ids:
                issues.append(f'Clip {index}: id duplicado {cid!r}.')
            else:
                clip_ids.add(cid)

    asset_ids = set()
    asset_names = set()
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            issues.append(f'Asset {index}: estructura inválida; se esperaba un objeto.')
            continue
        # Use the exact identity semantics consumed by normalize_project_media_ids.
        # Values such as 1, 1.0, "01" and "1.0" are the same browser/renderer
        # identity and must be rejected here, before normalization can raise an
        # uncontrolled exception or make a clip-to-file reference ambiguous.
        aid = media_id_key(asset.get('id'))
        if aid is None:
            issues.append(f'Asset {index}: id inválido.')
        elif aid in asset_ids:
            issues.append(f'Asset {index}: id duplicado o ambiguo {aid!r}; el render no puede elegir un archivo de forma segura.')
        else:
            asset_ids.add(aid)

        raw_name = asset.get('name')
        name = _safe_asset_name(raw_name)
        if name is None:
            issues.append(f'Asset {index}: nombre de archivo inválido o ruta no permitida.')
        else:
            key = name.casefold()
            if key in asset_names:
                issues.append(f'Asset {index}: nombre de archivo duplicado {name!r}; el bundle sería ambiguo en Windows.')
            else:
                asset_names.add(key)

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
