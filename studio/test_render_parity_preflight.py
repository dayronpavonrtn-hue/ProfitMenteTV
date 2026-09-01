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
        {'id': 'v1', 'track': 0, 'name': 'Video', 'start': 0, 'duration': 3, 'transition': 'fade', 'transitionDuration': .3, 'fitMode': 'cover'},
        {'id': 't1', 'track': 2, 'name': 'Título', 'start': 0, 'duration': 2, 'textStyle': 'callout', 'textAnimation': 'slide-up'},
        {'id': 'c1', 'track': 3, 'name': 'Caption', 'start': 0, 'duration': 2},
    ],
}
assert_ok(base)
assert_bad({**base, 'fps': 25}, 'FPS')
assert_bad({**base, 'clips': [{**base['clips'][0], 'transition': 'wipe'}]}, 'transición')
assert_bad({**base, 'clips': [{**base['clips'][0], 'fitMode': 'stretch'}]}, 'ajuste')
assert_bad({**base, 'clips': [{**base['clips'][0], 'transitionDuration': 0}]}, 'duración de transición')
assert_bad({**base, 'clips': [{**base['clips'][1], 'textAnimation': 'bounce'}]}, 'animación')
assert_bad({**base, 'clips': [{**base['clips'][1], 'textStyle': 'lower-third'}]}, 'estilo')
assert_bad({**base, 'clips': [{'id': 'v2', 'track': 0, 'name': 'Bad number', 'start': 'abc', 'duration': 2}]}, 'start')
print('Render parity preflight regression OK')
