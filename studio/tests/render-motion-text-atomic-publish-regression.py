#!/usr/bin/env python3
"""Regression guard for direct MP4 atomic publishing.

This is intentionally a structural test: render_motion_text.py is the direct
Studio entrypoint and must never hand the requested deliverable path to a
renderer before all stages succeed. The final artifact is published only with
os.replace() from a sibling temporary file and the temporary is always cleaned.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "render_motion_text.py").read_text(encoding="utf-8")

required = {
    "sibling temporary candidate": "tempfile.mkstemp(",
    "temporary render suffix": ".rendering.mp4",
    "visual stage targets intermediate": "str(video_only)",
    "audio stage targets temporary candidate": "str(tmp_output)",
    "empty-output guard": "tmp_output.stat().st_size<=0",
    "atomic publish": "os.replace(tmp_output,output_path)",
    "cleanup": "tmp_output.unlink(missing_ok=True)",
}

missing = [label for label, needle in required.items() if needle not in SOURCE]
if missing:
    raise SystemExit("Direct MP4 atomic publish regression failed: " + ", ".join(missing))

publish = SOURCE.index("os.replace(tmp_output,output_path)")
audio = SOURCE.index("render_audio_mix.py")
if publish <= audio:
    raise SystemExit("Direct MP4 is published before the final audio/mux stage")

# The requested output must not be passed to either low-level render subprocess.
for line in SOURCE.splitlines():
    if "subprocess.run" in line and ("render_mp4.py" in line or "render_audio_mix.py" in line):
        if "output_path" in line:
            raise SystemExit("Low-level renderer received final output_path directly")

print("PASS: direct MP4 render uses candidate + atomic publish + cleanup")
