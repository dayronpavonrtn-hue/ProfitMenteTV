#!/usr/bin/env python3
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
RENDER = ROOT / 'render_mp4.py'


def write_ppm(path, rgb):
    w = h = 16
    header = f'P6\n{w} {h}\n255\n'.encode('ascii')
    path.write_bytes(header + bytes(rgb) * (w * h))


def center_rgb(video, at=0.20):
    proc = subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(at), '-i', str(video),
        '-frames:v', '1', '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ], check=True, capture_output=True)
    if len(proc.stdout) < 3:
        raise AssertionError('No se pudo leer el frame de control')
    return tuple(proc.stdout[:3])


def main():
    with tempfile.TemporaryDirectory(prefix='profitmente-layer-order-') as td:
        td = pathlib.Path(td)
        assets = td / 'assets'
        assets.mkdir()
        write_ppm(assets / 'base.ppm', (245, 20, 20))
        write_ppm(assets / 'overlay.ppm', (20, 35, 245))

        # The overlay starts first on purpose. Track depth, not start time, must
        # decide final compositing order: track 1 stays above track 0.
        project = {
            'format': '1:1', 'fps': 24, 'duration': 0.45,
            'assets': [
                {'id': 'base', 'name': 'base.ppm', 'type': 'image'},
                {'id': 'overlay', 'name': 'overlay.ppm', 'type': 'image'},
            ],
            'clips': [
                {'id': 'overlay-early', 'track': 1, 'asset': 'overlay', 'start': 0.0, 'duration': 0.45, 'transition': 'cut'},
                {'id': 'base-late', 'track': 0, 'asset': 'base', 'start': 0.10, 'duration': 0.35, 'transition': 'cut'},
            ],
        }
        project_path = td / 'project.json'
        output = td / 'layer-order.mp4'
        project_path.write_text(json.dumps(project), encoding='utf-8')

        subprocess.run([sys.executable, str(RENDER), str(project_path), str(assets), str(output)], check=True)
        r, g, b = center_rgb(output)
        assert b > 180 and b > r * 2, f'Orden multicapa incorrecto; pixel central RGB={(r, g, b)}'
        print(f'Visual track order QA OK · RGB={(r, g, b)}')


if __name__ == '__main__':
    main()
