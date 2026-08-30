#!/usr/bin/env python3
"""Regression: long static captions must stay render-safe and produce a usable MP4."""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
RENDER = ROOT / 'render_mp4.py'
sys.path.insert(0, str(ROOT))
from caption_layout import estimate_width, layout_caption


def assert_layout(text, base=60, width=1080):
    layout = layout_caption(text, base, width)
    assert 1 <= len(layout['lines']) <= 3, layout
    assert layout['size'] <= base, layout
    for line in layout['lines']:
        assert estimate_width(line, layout['size']) <= layout['max_width'] + 0.001, (line, layout)
    return layout


def main():
    wrapped = assert_layout(
        'La inteligencia artificial puede ayudarte a organizar mejor tus inversiones y decisiones financieras'
    )
    assert len(wrapped['lines']) >= 2, wrapped

    hard = assert_layout('SUPERAUTOMATIZACIONFINANCIERAPROFESIONALSINPAGARMENSUALIDADES')
    assert len(hard['lines']) >= 2, hard

    extreme = assert_layout(' '.join(['automatizacion'] * 28))
    assert len(extreme['lines']) == 3, extreme
    assert extreme['lines'][-1].endswith('…'), extreme

    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('FFmpeg/ffprobe required for caption layout render regression')

    with tempfile.TemporaryDirectory(prefix='profitmente-caption-layout-') as tmp:
        root = pathlib.Path(tmp)
        assets = root / 'assets'
        assets.mkdir()
        project = {
            'format': '9:16',
            'duration': 1.2,
            'fps': 30,
            'assets': [],
            'clips': [{
                'id': 'caption-long',
                'track': 3,
                'start': 0,
                'duration': 1.1,
                'name': 'La inteligencia artificial puede ayudarte a crear un sistema financiero automatico sin pagar herramientas premium',
                'style': 'hook-pop',
                'animation': 'pop'
            }]
        }
        project_path = root / 'project.json'
        project_path.write_text(json.dumps(project), encoding='utf-8')
        output = root / 'caption-layout.mp4'
        proc = subprocess.run(
            [sys.executable, str(RENDER), str(project_path), str(assets), str(output)],
            cwd=ROOT.parent,
            capture_output=True,
            text=True,
        )
        if proc.returncode:
            print(proc.stdout)
            print(proc.stderr, file=sys.stderr)
            raise SystemExit(proc.returncode)
        command = proc.stdout + proc.stderr
        if command.count('drawtext=') < 2:
            raise AssertionError('Long caption was not split into multiple render lines')
        if not output.exists() or output.stat().st_size < 1024:
            raise AssertionError('Long caption render did not produce a usable MP4')
        probe = subprocess.run([
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,width,height', '-of', 'json', str(output)
        ], check=True, capture_output=True, text=True)
        stream = json.loads(probe.stdout)['streams'][0]
        assert stream['codec_name'] == 'h264', stream
        assert (int(stream['width']), int(stream['height'])) == (1080, 1920), stream

    print('Long caption layout + MP4 regression OK')


if __name__ == '__main__':
    main()
