#!/usr/bin/env python3
"""Regression: direct Studio MP4 publishing stays atomic and cleans candidates.

The direct renderer is a user-facing export path, so it must never hand FFmpeg
the requested final destination. The final mux must target a same-directory
candidate, verify that candidate exists/non-empty, then atomically publish it.
This source-level contract test is deterministic and does not require media.
"""
from __future__ import annotations

import ast
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "render_motion_text.py"


def main() -> None:
    source = TARGET.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(TARGET))

    calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)]
    has_mkstemp = any(
        isinstance(call.func, ast.Attribute)
        and isinstance(call.func.value, ast.Name)
        and call.func.value.id == "tempfile"
        and call.func.attr == "mkstemp"
        for call in calls
    )
    has_atomic_replace = any(
        isinstance(call.func, ast.Attribute)
        and isinstance(call.func.value, ast.Name)
        and call.func.value.id == "os"
        and call.func.attr == "replace"
        and len(call.args) >= 2
        and isinstance(call.args[0], ast.Name)
        and call.args[0].id == "tmp_output"
        and isinstance(call.args[1], ast.Name)
        and call.args[1].id == "output_path"
        for call in calls
    )

    if not has_mkstemp:
        raise AssertionError("direct renderer no longer reserves a temporary output candidate")
    if not has_atomic_replace:
        raise AssertionError("direct renderer no longer atomically publishes tmp_output -> output_path")
    if "tmp_output.unlink(missing_ok=True)" not in source:
        raise AssertionError("direct renderer no longer guarantees temporary candidate cleanup")
    if "tmp_output.stat().st_size<=0" not in source.replace(" ", ""):
        raise AssertionError("direct renderer no longer rejects an empty MP4 candidate")

    # The final audio mux is the stage that creates the deliverable. It must be
    # pointed at the candidate, never directly at the user's final path.
    audio_mix_lines = [line for line in source.splitlines() if "render_audio_mix.py" in line]
    if len(audio_mix_lines) != 1:
        raise AssertionError(f"expected one final audio mux invocation, found {len(audio_mix_lines)}")
    mux_line = audio_mix_lines[0]
    if "str(tmp_output)" not in mux_line or "sys.argv[3]" in mux_line:
        raise AssertionError("final audio mux can write directly to the requested final MP4")

    print("direct render atomic publish regression: PASS")


if __name__ == "__main__":
    main()
