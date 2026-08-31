#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import tempfile

from media_proxy_server import build_proxy_command, create_preview_proxy, safe_suffix


def probe(path: pathlib.Path) -> dict:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def main():
    assert safe_suffix("clip.MOV") == ".mov"
    assert safe_suffix("camera%20file.mkv") == ".mkv"
    assert safe_suffix("unsafe.exe") == ".video"

    dummy = build_proxy_command(pathlib.Path("source.mov"), pathlib.Path("proxy.mp4"))
    joined = " ".join(dummy)
    assert "libx264" in dummy
    assert "aac" in dummy
    assert "force_original_aspect_ratio=decrease" in joined
    assert "-crf" in dummy and "30" in dummy
    assert "+faststart" in dummy

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("media proxy command regression OK; real encode skipped (FFmpeg unavailable)")
        return

    with tempfile.TemporaryDirectory(prefix="profitmente-proxy-test-") as td:
        root = pathlib.Path(td)
        source = root / "source.mp4"
        output = root / "proxy.mp4"
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=24",
                "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000",
                "-t", "1.2", "-shortest",
                "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", str(source),
            ],
            check=True,
        )
        create_preview_proxy(source, output, timeout=60)
        info = probe(output)
        streams = info.get("streams", [])
        video = next(s for s in streams if s.get("codec_type") == "video")
        audio = next(s for s in streams if s.get("codec_type") == "audio")
        assert video.get("codec_name") == "h264", video
        assert audio.get("codec_name") == "aac", audio
        assert int(video.get("width", 0)) <= 960, video
        assert int(video.get("height", 0)) <= 960, video
        assert int(video.get("width", 0)) % 2 == 0, video
        assert int(video.get("height", 0)) % 2 == 0, video
        assert output.stat().st_size > 0
        print(f"media proxy real encode OK: {video['width']}x{video['height']} H.264 + AAC")


if __name__ == "__main__":
    main()
