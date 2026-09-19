from studio.export_pipeline import build_export


def project(source_volume):
    return {
        'name': 'source-audio-preflight',
        'duration': 5,
        'assets': [{'id': 'v1', 'type': 'video', 'duration': 5, 'width': 1080, 'height': 1920}],
        'clips': [{'id': 'vclip', 'track': 0, 'asset': 'v1', 'start': 0, 'duration': 5, 'sourceVolume': source_volume}],
    }


def expect_blocked(value):
    try:
        build_export(project(value))
    except ValueError as exc:
        assert 'sourceVolume' in str(exc), exc
        return
    raise AssertionError(f'sourceVolume={value!r} debió bloquear la exportación')


for invalid in (-0.01, 2.01, 'nan', 'alto'):
    expect_blocked(invalid)

for valid in (0, 1, 2):
    result = build_export(project(valid), final=False)
    clip = result['plan']['tracks']['video'][0]
    assert clip['source_volume'] == float(valid)

print('SOURCE AUDIO EXPORT INTEGRATION OK')
