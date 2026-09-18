import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio_bridge import convert

VISUAL_TRACKS = ('video', 'overlay', 'motion')
AUDIO_TRACKS = ('sfx', 'music', 'voice')


def _coverage(items, duration):
    spans = []
    for item in items:
        try:
            start, end = float(item['start']), float(item['end'])
        except (KeyError, TypeError, ValueError):
            continue
        start, end = max(0.0, start), min(duration, end)
        if end > start:
            spans.append((start, end))
    if not spans:
        return 0.0, [(0.0, duration)] if duration > 0 else []
    spans.sort()
    merged = []
    for start, end in spans:
        if merged and start <= merged[-1][1] + 1e-6:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    covered = sum(end - start for start, end in merged)
    gaps, cursor = [], 0.0
    for start, end in merged:
        if start > cursor + 1e-6:
            gaps.append((cursor, start))
        cursor = max(cursor, end)
    if cursor < duration - 1e-6:
        gaps.append((cursor, duration))
    return covered, gaps


def inspect_plan(plan, final=False):
    if not isinstance(plan, dict):
        raise TypeError('Plan inválido')
    duration = float(plan.get('duration') or 0)
    tracks = plan.get('tracks') if isinstance(plan.get('tracks'), dict) else {}
    visual = [item for name in VISUAL_TRACKS for item in tracks.get(name, []) if isinstance(item, dict)]
    audio = [item for name in AUDIO_TRACKS for item in tracks.get(name, []) if isinstance(item, dict)]
    captions = [item for item in tracks.get('captions', []) if isinstance(item, dict)]
    covered, gaps = _coverage(visual, duration)
    ratio = covered / duration if duration > 0 else 0.0
    blockers, warnings = [], []
    if duration <= 0:
        blockers.append('La duración del proyecto no es válida.')
    if not visual:
        blockers.append('No hay clips visuales para renderizar.')
    elif gaps:
        message = f'La imagen no cubre todo el proyecto: {len(gaps)} hueco(s) en timeline.'
        (blockers if final else warnings).append(message)
    if not audio:
        warnings.append('El proyecto no contiene pistas de audio.')
    if not captions:
        warnings.append('El proyecto no contiene captions.')
    unresolved = [item.get('id') for item in visual + audio if item.get('asset_id') is None]
    if unresolved:
        message = f'Hay {len(unresolved)} clip(s) sin medio fuente; el generador deberá resolverlos antes del render final.'
        (blockers if final else warnings).append(message)
    return {
        'ok': not blockers,
        'stage': 'final-render' if final else 'generator',
        'blockers': blockers,
        'warnings': warnings,
        'metrics': {
            'duration': duration,
            'visual_coverage_seconds': round(covered, 6),
            'visual_coverage_ratio': round(ratio, 6),
            'visual_clips': len(visual),
            'audio_clips': len(audio),
            'caption_clips': len(captions),
            'unresolved_source_clips': len(unresolved),
            'timeline_gaps': [{'start': round(a, 6), 'end': round(b, 6)} for a, b in gaps],
        },
    }


def inspect_project(project, final=False):
    try:
        plan = convert(project)
    except (TypeError, ValueError) as exc:
        return {'ok': False, 'stage': 'final-render' if final else 'generator', 'blockers': [str(exc)], 'warnings': [], 'metrics': {}}
    return inspect_plan(plan, final=final)


def main():
    parser = argparse.ArgumentParser(description='QA local y gratuito antes de generar o renderizar un proyecto de ProfitMente Studio.')
    parser.add_argument('project', help='JSON exportado por ProfitMente Studio')
    parser.add_argument('-o', '--output', help='Guardar reporte JSON opcional')
    parser.add_argument('--final', action='store_true', help='Aplicar el gate estricto de render final: sin huecos ni medios sin resolver.')
    args = parser.parse_args()
    project = json.loads(Path(args.project).read_text(encoding='utf-8'))
    report = inspect_project(project, final=args.final)
    text = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding='utf-8')
    print(text)
    raise SystemExit(0 if report['ok'] else 2)


if __name__ == '__main__':
    main()
