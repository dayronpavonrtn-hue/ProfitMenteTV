#!/usr/bin/env python3
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
RENDER = ROOT / 'render_mp4.py'


def write_ppm(path, rgb=(245, 245, 245), size=48):
    pixel = bytes(rgb)
    path.write_bytes(f'P6\n{size} {size}\n255\n'.encode('ascii') + pixel * (size * size))


def sample_center(mp4, at):
    proc = subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(at), '-i', str(mp4),
        '-vf', 'crop=1:1:(iw-1)/2:(ih-1)/2,format=rgb24', '-frames:v', '1',
        '-f', 'rawvideo', '-'
    ], check=True, capture_output=True)
    if len(proc.stdout) < 3:
        raise AssertionError('No se pudo muestrear el frame renderizado')
    return tuple(proc.stdout[:3])


def brightness(rgb):
    return sum(rgb) / 3


def main():
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        assets = tmp / 'assets'; assets.mkdir()
        image = assets / 'white.ppm'; write_ppm(image)
        project = {
            'format': '1:1', 'fps': 24, 'duration': 1.0,
            'assets': [{'id': 'img', 'name': 'white.ppm', 'type': 'image'}],
            'clips': [{
                'id': 'overlay', 'asset': 'img', 'track': 1, 'start': 0, 'duration': 1,
                'fitMode': 'cover', 'transition': 'cut', 'opacity': 1,
                'keyframes': {
                    'start': {'positionX': 0, 'positionY': 0, 'scale': 1, 'rotation': 0, 'opacity': 0.05},
                    'end': {'positionX': 0, 'positionY': 0, 'scale': 1, 'rotation': 0, 'opacity': 1.0}
                }
            }]
        }
        project_path = tmp / 'project.json'; project_path.write_text(json.dumps(project), encoding='utf-8')
        output = tmp / 'opacity.mp4'
        subprocess.run([sys.executable, str(RENDER), str(project_path), str(assets), str(output)], check=True, cwd=ROOT)
        early = sample_center(output, 0.08)
        late = sample_center(output, 0.88)
        early_b = brightness(early); late_b = brightness(late)
        if not late_b > early_b + 100:
            raise AssertionError(f'La opacidad no progresa en render: early={early} late={late}')
        if late_b < 190:
            raise AssertionError(f'El keyframe final no alcanza opacidad visual suficiente: {late}')
        print(f'keyframe opacity render regression: ok · early={early} late={late}')


if __name__ == '__main__':
    main()
