#!/usr/bin/env python3
"""Reject ambiguous persisted render-state flags before local MP4 composition.

Studio state flags are JSON booleans. Python/FFmpeg helpers must never interpret
strings such as "false" as truthy, because that changes preview -> render parity.
Runs locally only; no network or paid services.
"""
import json, pathlib, sys

if len(sys.argv) != 2:
    raise SystemExit('Usage: render_state_preflight.py project.json')

project = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
errors = []
FLAGS = ('hidden', 'muted', 'solo', 'locked')

for field in ('trackState', 'trackStates'):
    states = project.get(field)
    if states is None:
        continue
    if not isinstance(states, dict):
        errors.append(f'{field} debe ser un objeto')
        continue
    for track, state in states.items():
        if not isinstance(state, dict):
            errors.append(f'{field}[{track}] debe ser un objeto')
            continue
        for flag in FLAGS:
            if flag in state and not isinstance(state[flag], bool):
                errors.append(f'{field}[{track}].{flag} debe ser booleano JSON')

clips = project.get('clips', [])
if isinstance(clips, list):
    for index, clip in enumerate(clips):
        if not isinstance(clip, dict):
            continue
        for flag in ('muted', 'disabled', 'flipX', 'flipY'):
            if flag in clip and not isinstance(clip[flag], bool):
                errors.append(f'Clip {index}: {flag} debe ser booleano JSON')

print(json.dumps({'ok': not errors, 'errors': errors}, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(2)
