#!/usr/bin/env python3
"""Regression: timed word captions stay inside the render safe width and still render."""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
RENDER = ROOT / 'render_mp4.py'
sys.path.insert(0, str(ROOT))
from caption_layout import estimate_width
from caption_word_layout import fit_word_caption

LONG_WORD = 'SUPERCALIFRAGILISTICEXPIALIDOCIOUSFINANCIERO'


def test_layout():
    layout = fit_word_caption(LONG_WORD, 78, 1080)
    assert layout['size_cap'] < 78, layout
    estimated = estimate_width(LONG_WORD, layout['size_cap']) + layout['box_padding'] * 2
    assert estimated <= layout['safe_width'] + 0.001, (estimated, layout)

    short = fit_word_caption('DINERO', 78, 1080)
    assert short['resting_size'] == 78, short
    assert short['size_cap'] >= 78, short

    pathological = fit_word_caption('W' * 180, 78, 1080)
    pathological_width = estimate_width('W' * 180, pathological['size_cap']) + pathological['box_padding'] * 2
    assert pathological_width <= pathological['safe_width'] + 0.001, pathological


def test_real_render():
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('FFmpeg/ffprobe required for timed word caption render regression')

    with tempfile.TemporaryDirectory(prefix='profitmente-caption-word-safe-') as tmp:
        root = pathlib.Path(tmp)
        assets = root / 'assets'
        assets.mkdir()
        project = {
            'format': '9:16',
            'duration': 1.4,
            'fps': 30,
            'assets': [],
            'clips': [{
                'id': 'caption-long-word',
                'track': 3,
                'start': 0,
                'duration': 1.2,
                'name': LONG_WORD,
                'wordTimings': [{
                    'word': LONG_WORD,
                    'start': 0.05,
                    'end': 1.10,
                    'duration': 1.05,
                }],
            }],
        }
        project_path = root / 'project.json'
        project_path.write_text(json.dumps(project), encoding='utf-8')
        output = root / 'caption-word-safe.mp4'
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
        combined = proc.stdout + proc.stderr
        assert "fontsize='min(78*" in combined, combined[-4000:]
        assert output.exists() and output.stat().st_size > 1024, output

        probe = subprocess.run([
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
            '-of', 'json', str(output),
        ], check=True, capture_output=True, text=True)
        stream = json.loads(probe.stdout)['streams'][0]
        assert stream['codec_name'] == 'h264', stream
        assert (int(stream['width']), int(stream['height'])) == (1080, 1920), stream
        print('Timed word safe-width MP4 regression OK:', output.stat().st_size, 'bytes')


def main():
    test_layout()
    test_real_render()


if __name__ == '__main__':
    main()
