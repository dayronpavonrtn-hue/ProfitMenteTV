#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import shutil
import subprocess
import tempfile

from verify_render_decode import verify_render_decode


if not shutil.which('ffmpeg'):
    raise SystemExit('ffmpeg is required for this regression test')

with tempfile.TemporaryDirectory(prefix='profitmente-decode-test-') as td:
    td = pathlib.Path(td)
    valid = td / 'valid.mp4'
    subprocess.run([
        'ffmpeg','-hide_banner','-loglevel','error','-y',
        '-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=1.5',
        '-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1.5',
        '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(valid)
    ], check=True)
    verify_render_decode(valid)

    broken = td / 'broken.mp4'
    data = valid.read_bytes()
    # Remove enough of the tail to invalidate/truncate the encoded stream. The
    # strict -xerror decode gate must reject it even if a partial MP4 remains.
    broken.write_bytes(data[:max(1, int(len(data) * 0.70))])
    try:
        verify_render_decode(broken)
    except RuntimeError as exc:
        assert 'Integridad de decodificación MP4 falló' in str(exc) or 'MP4 final' in str(exc), exc
    else:
        raise AssertionError('A truncated MP4 unexpectedly passed full decode verification')

print('render decode integrity regression ok')
