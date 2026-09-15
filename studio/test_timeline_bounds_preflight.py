#!/usr/bin/env python3
from timeline_bounds_preflight import inspect


def project(clips, track_state=None):
    return {'duration': 10, 'clips': clips, 'trackState': track_state or {}}


assert inspect(project([{'id': 'ok', 'track': 0, 'start': 1, 'duration': 9}])) == []
assert inspect(project([{'id': 'tiny-rounding', 'track': 0, 'start': 1, 'duration': 9.03}])) == []
issues = inspect(project([{'id': 'cut-off', 'track': 0, 'start': 8, 'duration': 3}]))
assert len(issues) == 1 and 'recortaría' in issues[0]
issues = inspect(project([{'id': 'after-end', 'track': 2, 'start': 10, 'duration': 1}]))
assert len(issues) == 1 and 'fuera de la duración' in issues[0]
# Hidden/muted tracks are semantically inactive and must not block a render.
assert inspect(project([{'id': 'hidden', 'track': 1, 'start': 9, 'duration': 4}], {'1': {'hidden': True}})) == []
assert inspect(project([{'id': 'muted-track', 'track': 6, 'start': 9, 'duration': 4}], {'6': {'muted': True}})) == []
# Clip-level mute is also an effective render exclusion on audio tracks.
assert inspect(project([{'id': 'muted-clip', 'track': 5, 'start': 9, 'duration': 4, 'muted': True}])) == []
# Strict boolean semantics: imported strings must not silently disable content.
issues = inspect(project([{'id': 'string-mute', 'track': 5, 'start': 9, 'duration': 4, 'muted': 'true'}]))
assert len(issues) == 1
# A visual clip remains visible even when its source audio is muted.
issues = inspect(project([{'id': 'visual-muted-audio', 'track': 0, 'start': 9, 'duration': 4, 'muted': True}]))
assert len(issues) == 1
# Legacy numeric track aliases are normalized exactly like the render boundary.
issues = inspect(project([{'id': 'legacy', 'track': '00', 'start': '9', 'duration': '2'}]))
assert len(issues) == 1
print('Timeline bounds preflight regression OK')
