#!/usr/bin/env python3
"""Regression: word-timed captions must render with the same pop treatment as preview."""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
RENDER = ROOT / 'render_mp4.py'


def main():
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('FFmpeg/ffprobe required for caption render regression')

    with tempfile.TemporaryDirectory(prefix='profitmente-caption-pop-') as tmp:
        root = pathlib.Path(tmp)
        assets = root / 'assets'
        assets.mkdir()
        project = {
            'format': '9:16',
            'duration': 0.65,
            'assets': [],
            'clips': [{
                'id': 'caption-1',
                'track': 3,
                'start': 0,
                'duration': 0.65,
                'name': 'DINERO',
                'wordTimings': [
                    {'word': 'DINERO', 'start': 0.05, 'end': 0.55, 'duration': 0.50}
                ]
            }]
        }
        project_path = root / 'project.json'
        project_path.write_text(json.dumps(project), encoding='utf-8')
        output = root / 'caption-pop.mp4'

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
        if not output.exists() or output.stat().st_size < 1024:
            raise AssertionError('Caption pop render did not produce a usable MP4')

        probe = subprocess.run([
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,width,height', '-of', 'json', str(output)
        ], check=True, capture_output=True, text=True)
        info = json.loads(probe.stdout)
        stream = info['streams'][0]
        assert stream['codec_name'] == 'h264', stream
        assert (int(stream['width']), int(stream['height'])) == (1080, 1920), stream
        print('Caption pop MP4 regression OK:', output.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
