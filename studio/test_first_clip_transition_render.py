#!/usr/bin/env python3
"""Regression: a transition belongs to an incoming clip, so a clip at t=0 has no entrance effect.

The browser preview intentionally ignores fade/slide/zoom entrance transforms when start == 0.
This test renders the same first clip once as a cut and once with a manual zoom transition and
requires their decoded first frames to match.
"""
import json
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
RENDER = ROOT / "render_mp4.py"


def require_tool(name):
    if not shutil.which(name):
        raise SystemExit(f"SKIP: {name} no está disponible")


def make_ppm(path, size=320):
    header = f"P6\n{size} {size}\n255\n".encode("ascii")
    pixels = bytearray()
    for y in range(size):
        for x in range(size):
            # High-frequency asymmetric pattern makes a 2.5% crop/zoom detectable.
            pixels.extend(((x * 7 + y * 3) % 256, (x * 2 + y * 11) % 256, (x * 13 + y * 5) % 256))
    path.write_bytes(header + pixels)


def project(transition):
    return {
        "name": f"first-{transition}",
        "format": "1:1",
        "duration": 0.35,
        "fps": 30,
        "assets": [{"id": "pattern", "name": "pattern.ppm", "type": "image"}],
        "clips": [{
            "id": "v0",
            "asset": "pattern",
            "track": 0,
            "start": 0,
            "duration": 0.35,
            "transition": transition,
            "transitionDuration": 0.20,
            "fitMode": "cover",
        }],
    }


def render(tmp, transition):
    project_path = tmp / f"{transition}.json"
    output_path = tmp / f"{transition}.mp4"
    project_path.write_text(json.dumps(project(transition)), encoding="utf-8")
    subprocess.run(
        ["python3", str(RENDER), str(project_path), str(tmp), str(output_path)],
        cwd=ROOT,
        check=True,
        stdout=subprocess.DEVNULL,
    )
    return output_path


def first_frame_hash(path):
    result = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-frames:v", "1", "-f", "framemd5", "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    rows = [line.strip() for line in result.stdout.splitlines() if line.strip() and not line.startswith("#")]
    if not rows:
        raise AssertionError(f"No se pudo obtener hash del primer frame: {path}")
    return rows[0].split(",")[-1].strip()


def main():
    require_tool("ffmpeg")
    require_tool("ffprobe")
    with tempfile.TemporaryDirectory(prefix="profitmente-first-transition-") as td:
        tmp = pathlib.Path(td)
        make_ppm(tmp / "pattern.ppm")
        cut = render(tmp, "cut")
        zoom = render(tmp, "zoom")
        cut_hash = first_frame_hash(cut)
        zoom_hash = first_frame_hash(zoom)
        assert cut_hash == zoom_hash, (
            "El primer clip cambia de encuadre en MP4 por una transición de entrada que el Preview no aplica: "
            f"cut={cut_hash}, zoom={zoom_hash}"
        )
    print("OK: first clip transition render matches preview semantics")


if __name__ == "__main__":
    main()
