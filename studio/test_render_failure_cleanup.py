#!/usr/bin/env python3
"""Regression: failed async renders must release their temporary files."""
from __future__ import annotations

import pathlib
import tempfile

from studio_server import _mark_job_error


with tempfile.TemporaryDirectory(prefix="profitmente-failure-cleanup-parent-") as parent:
    root = pathlib.Path(parent) / "job"
    root.mkdir()
    bundle = root / "project.profitmente.tar"
    output = root / "output.mp4"
    progress = root / "render-progress.json"
    bundle.write_bytes(b"bundle")
    output.write_bytes(b"partial")
    progress.write_text('{"progress":75}', encoding="utf-8")

    job = {
        "id": "failure-cleanup",
        "status": "rendering",
        "progress": 75,
        "phase": "Renderizando",
        "tempdir": str(root),
        "bundle": str(bundle),
        "output": str(output),
        "process": object(),
        "error": None,
        "qc": None,
    }
    qc = {"ok": False, "issues": ["audio incompleto"]}
    _mark_job_error(job, "El control final falló", phase="Control de calidad fallido", qc=qc)

    assert job["status"] == "error"
    assert job["progress"] == 100
    assert job["phase"] == "Control de calidad fallido"
    assert job["error"] == "El control final falló"
    assert job["qc"] == qc
    assert job["process"] is None
    assert job["tempdir"] is None
    assert not root.exists(), "failed render left temporary files on disk"

print("Render failure cleanup QA OK")
