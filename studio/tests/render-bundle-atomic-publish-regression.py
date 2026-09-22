#!/usr/bin/env python3
"""Regression: a failed MP4 render must never destroy the last good export.

This intentionally feeds an invalid project so render_bundle.py fails during
preflight, before FFmpeg composition. Existing final MP4/QC artifacts must stay
byte-for-byte unchanged and temporary candidate files must be cleaned up.
"""
from __future__ import annotations

import io
import json
import pathlib
import subprocess
import sys
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
RENDER = ROOT / "render_bundle.py"


def add_bytes(tar: tarfile.TarFile, name: str, payload: bytes) -> None:
    info = tarfile.TarInfo(name)
    info.size = len(payload)
    tar.addfile(info, io.BytesIO(payload))


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="profitmente-atomic-publish-") as td:
        work = pathlib.Path(td)
        bundle = work / "broken.profitmente.tar"
        output = work / "final.mp4"
        report = work / "final.mp4.qc.json"

        previous_video = b"PROFITMENTE_PREVIOUS_GOOD_MP4"
        previous_report = b'{"ok":true,"score":100,"sentinel":"previous-good"}'
        output.write_bytes(previous_video)
        report.write_bytes(previous_report)

        # Deliberately malformed project structure: preflight must reject it.
        project = {"version": "1.3", "name": "Broken atomic publish regression", "clips": "not-a-list"}
        with tarfile.open(bundle, "w") as tar:
            add_bytes(tar, "project.json", json.dumps(project).encode("utf-8"))

        result = subprocess.run(
            [sys.executable, str(RENDER), str(bundle), str(output)],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        if result.returncode == 0:
            raise AssertionError("render_bundle.py accepted an intentionally invalid project")
        if output.read_bytes() != previous_video:
            raise AssertionError("failed render replaced or modified the previous good MP4")
        if report.read_bytes() != previous_report:
            raise AssertionError("failed render replaced or modified the previous good QC report")

        leftovers = list(work.glob(".final.rendering-*"))
        if leftovers:
            raise AssertionError(f"temporary render candidates were not cleaned up: {leftovers}")

    print("render bundle atomic publish regression: PASS")


if __name__ == "__main__":
    main()
