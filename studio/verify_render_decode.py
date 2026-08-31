#!/usr/bin/env python3
"""Fail when a rendered MP4 cannot be fully decoded by local FFmpeg.

This is intentionally separate from visual/audio heuristics: corruption or a
truncated bitstream must never be downgraded to a warning by post-render QA.
No network or paid service is used.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys


def verify_render_decode(mp4: pathlib.Path) -> None:
    if not mp4.is_file():
        raise RuntimeError(f"El MP4 final no existe: {mp4}")
    if mp4.stat().st_size <= 0:
        raise RuntimeError("El MP4 final está vacío.")

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-nostats",
        "-v",
        "error",
        "-xerror",
        "-i",
        str(mp4),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-f",
        "null",
        "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "FFmpeg no pudo decodificar el archivo completo.").strip()
        if len(detail) > 1800:
            detail = detail[-1800:]
        raise RuntimeError(f"Integridad de decodificación MP4 falló: {detail}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_render_decode.py output.mp4")
    verify_render_decode(pathlib.Path(sys.argv[1]))
    print(f"Decode integrity OK: {sys.argv[1]}")
