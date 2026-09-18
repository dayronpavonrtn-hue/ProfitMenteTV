"""Regression checks for Studio's zero-cost media/track export gate."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from studio.export_pipeline import validate_media_track_compatibility


def project(asset_type, track, mime=None):
    asset = {'id': 'asset-1', 'type': asset_type}
    if mime is not None:
        asset['mime'] = mime
    return {
        'assets': [asset],
        'clips': [{'id': 'clip-1', 'track': track, 'asset': 'asset-1'}],
    }


def must_fail(value, expected):
    try:
        validate_media_track_compatibility(value)
    except ValueError as exc:
        assert expected in str(exc), str(exc)
    else:
        raise AssertionError('Expected incompatible media/track assignment to fail')


def main():
    # Valid renderable placements.
    assert validate_media_track_compatibility(project('video', 0))
    assert validate_media_track_compatibility(project('image', 1))
    assert validate_media_track_compatibility(project('video', 2))
    assert validate_media_track_compatibility(project('audio', 4))
    assert validate_media_track_compatibility(project('audio', 5))
    assert validate_media_track_compatibility(project('audio', 6))

    # Known impossible placements must fail before generator/render.
    must_fail(project('audio', 0), 'pista visual 0')
    must_fail(project('audio', 2), 'pista visual 2')
    must_fail(project('video', 4), 'pista de audio 4')
    must_fail(project('image', 6), 'pista de audio 6')

    # MIME metadata is enough when explicit type is absent.
    assert validate_media_track_compatibility(project('', 0, 'video/mp4'))
    must_fail(project('', 5, 'image/png'), 'pista de audio 5')

    # Unknown/legacy metadata remains permissive; studio_bridge owns missing refs.
    assert validate_media_track_compatibility(project('', 0))
    assert validate_media_track_compatibility({'assets': [], 'clips': [{'track': 3}]})
    print('media-track compatibility regression: OK')


if __name__ == '__main__':
    main()
