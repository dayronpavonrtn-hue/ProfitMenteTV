import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio_bridge import convert, normalize_asset_id, normalize_assets


def run():
    assets = normalize_assets([
        {'id': 7.0, 'name': 'clip.mp4', 'type': 'video', 'mime': 'video/mp4', 'duration': 4.5,
         'width': 1920, 'height': '1080', 'size': 123456, 'mediaReadable': True},
        {'id': 7, 'name': 'duplicate.mp4'},
    ])
    assert len(assets) == 1
    asset = assets[0]
    assert asset['id'] == '7'
    assert asset['width'] == 1920
    assert asset['height'] == 1080
    assert asset['size'] == 123456
    assert asset['media_readable'] is True
    assert normalize_asset_id(7.0) == '7'
    assert normalize_asset_id(-0.0) == '0'

    plan = convert({
        'duration': 4.5,
        'assets': [asset],
        'clips': [{'id': 'v', 'track': 0, 'asset': 7.0, 'start': 0, 'duration': 4.5}],
    })
    assert plan['tracks']['video'][0]['asset_id'] == '7'
    assert plan['assets'][0]['width'] == 1920

    try:
        convert({
            'duration': 1,
            'assets': [{'id': 'bad', 'type': 'video', 'duration': 1, 'mediaReadable': False}],
            'clips': [{'id': 'broken', 'track': 0, 'asset': 'bad', 'start': 0, 'duration': 1}],
        })
    except ValueError as exc:
        assert 'broken' in str(exc)
        assert 'decodificar' in str(exc)
    else:
        raise AssertionError('unreadable media must be blocked before generator/render')

    print('Studio bridge media metadata guard OK')


if __name__ == '__main__':
    run()
