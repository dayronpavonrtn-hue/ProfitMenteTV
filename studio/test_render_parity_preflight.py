#!/usr/bin/env python3
from render_parity_preflight import inspect


def assert_ok(project):
    issues = inspect(project)
    assert not issues, issues


def assert_bad(project, needle):
    issues = inspect(project)
    assert issues, 'Expected parity failure'
    assert any(needle in issue for issue in issues), issues


base = {
    'fps': 30,
    'clips': [
        {'id': 'v1', 'track': 0, 'name': 'Video', 'start': 0, 'duration': 3, 'sourceOffset': 0, 'speed': 1, 'transition': 'fade', 'transitionDuration': .3, 'fitMode': 'cover'},
        {'id': 't1', 'track': 2, 'name': 'Título', 'start': 0, 'duration': 2, 'textStyle': 'callout', 'textAnimation': 'slide-up'},
        {'id': 'c1', 'track': 3, 'name': 'Caption', 'start': 0, 'duration': 2},
    ],
}
assert_ok(base)
assert_bad({**base, 'fps': 25}, 'FPS')
assert_bad({**base, 'clips': [{**base['clips'][0], 'transition': 'wipe'}]}, 'transición')
assert_bad({**base, 'clips': [{**base['clips'][0], 'fitMode': 'stretch'}]}, 'ajuste')
assert_bad({**base, 'clips': [{**base['clips'][0], 'transitionDuration': 0}]}, 'duración de transición')
assert_bad({**base, 'clips': [{**base['clips'][0], 'transitionDuration': .01}]}, 'duración de transición')
assert_bad({**base, 'clips': [{**base['clips'][0], 'duration': .2, 'transitionDuration': .3}]}, 'duración de transición')
assert_bad({**base, 'clips': [{**base['clips'][1], 'textAnimation': 'bounce'}]}, 'animación')
assert_bad({**base, 'clips': [{**base['clips'][1], 'textStyle': 'lower-third'}]}, 'estilo')
assert_bad({**base, 'clips': [{'id': 'v2', 'track': 0, 'name': 'Bad number', 'start': 'abc', 'duration': 2}]}, 'start')
assert_bad({**base, 'clips': [{**base['clips'][0], 'start': -1}]}, 'start no puede')
assert_bad({**base, 'clips': [{**base['clips'][0], 'duration': 0}]}, 'duration debe')
assert_bad({**base, 'clips': [{**base['clips'][0], 'sourceOffset': -0.1}]}, 'sourceOffset')
assert_bad({**base, 'clips': [{**base['clips'][0], 'speed': .1}]}, 'velocidad')
assert_bad({**base, 'clips': [{**base['clips'][0], 'speed': 5}]}, 'velocidad')
assert_ok({**base, 'clips': [{**base['clips'][0], 'speed': .25}, {**base['clips'][1]}, {**base['clips'][2]}]})
assert_ok({**base, 'clips': [{**base['clips'][0], 'speed': 4}, {**base['clips'][1]}, {**base['clips'][2]}]})

# Imported/legacy projects can carry integral numeric aliases as strings. The
# FFmpeg renderer canonicalizes these before composition, so preflight must inspect
# the same semantic tracks instead of letting unsupported settings slip through.
for alias in ('00', '0.0', '01', '1.0'):
    assert_bad({**base, 'clips': [{**base['clips'][0], 'track': alias, 'transition': 'wipe'}]}, 'transición')
    assert_bad({**base, 'clips': [{**base['clips'][0], 'track': alias, 'fitMode': 'stretch'}]}, 'ajuste')
for alias in ('02', '2.0'):
    assert_bad({**base, 'clips': [{**base['clips'][1], 'track': alias, 'textAnimation': 'bounce'}]}, 'animación')
    assert_bad({**base, 'clips': [{**base['clips'][1], 'track': alias, 'textStyle': 'lower-third'}]}, 'estilo')

# Fractional/non-numeric tracks remain non-canonical and are handled by the project
# validator; preflight must not misclassify them as a valid visual/title track.
assert_ok({**base, 'clips': [{**base['clips'][0], 'track': '1.5', 'transition': 'wipe'}]})
assert_ok({**base, 'clips': [{**base['clips'][1], 'track': 'two', 'textAnimation': 'bounce'}]})
print('Render parity preflight regression OK')
