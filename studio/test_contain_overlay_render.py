#!/usr/bin/env python3
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
WIDTH, HEIGHT = 1080, 1920


def make_image(path, color, size):
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', f'color=c={color}:s={size}',
        '-frames:v', '1', str(path)
    ], check=True)


def pixel(raw, x, y):
    offset = (y * WIDTH + x) * 3
    return tuple(raw[offset:offset + 3])


with tempfile.TemporaryDirectory() as td:
    work = pathlib.Path(td)
    assets = work / 'assets'
    assets.mkdir()
    bottom = assets / 'bottom.png'
    overlay = assets / 'overlay.png'
    project = work / 'project.json'
    output = work / 'contain-overlay.mp4'

    make_image(bottom, '0xE02020', '540x960')
    make_image(overlay, '0x20D060', '640x360')

    data = {
        'format': '9:16',
        'duration': 1,
        'fps': 30,
        'assets': [
            {'id': 'bottom', 'name': bottom.name, 'type': 'image'},
            {'id': 'overlay', 'name': overlay.name, 'type': 'image'},
        ],
        'clips': [
            {'id': 'base', 'track': 0, 'asset': 'bottom', 'start': 0, 'duration': 1, 'fitMode': 'cover'},
            {'id': 'top', 'track': 1, 'asset': 'overlay', 'start': 0, 'duration': 1, 'fitMode': 'contain'},
        ],
    }
    project.write_text(json.dumps(data), encoding='utf-8')

    subprocess.run([
        sys.executable, str(ROOT / 'render_mp4.py'),
        str(project), str(assets), str(output)
    ], check=True)

    raw = subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error',
        '-ss', '0.5', '-i', str(output), '-frames:v', '1',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ], check=True, capture_output=True).stdout

    expected = WIDTH * HEIGHT * 3
    assert len(raw) >= expected, f'Frame incompleto: {len(raw)} < {expected}'

    edge = pixel(raw, WIDTH // 2, 100)
    center = pixel(raw, WIDTH // 2, HEIGHT // 2)

    assert edge[0] > edge[1] + 80 and edge[0] > edge[2] + 80, (
        f'Contain overlay tapó la capa inferior en el área letterbox: edge={edge}'
    )
    assert center[1] > center[0] + 80 and center[1] > center[2] + 80, (
        f'El contenido central de la capa superior no quedó visible: center={center}'
    )

    print(f'Contain overlay transparency OK · edge={edge} center={center}')
