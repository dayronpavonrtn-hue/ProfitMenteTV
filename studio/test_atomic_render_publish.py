#!/usr/bin/env python3
"""Regression guard for atomic publication and safe bundle extraction."""
from __future__ import annotations
import ast
import io
import pathlib
import subprocess
import sys
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
SOURCE_PATH = ROOT / "render_bundle.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)

# The renderer must use a distinct sibling candidate, not the final path, through
# composition/decode/QC and only publish after QC has explicitly passed.
assert "candidate=out.with_name" in SOURCE, "render candidate path is missing"
assert "render_motion_text.py'),str(project),str(assets),str(candidate)" in SOURCE
assert "verify_render_decode.py'),str(candidate)" in SOURCE
assert "output_qc.py'),str(project),str(candidate),str(candidate_report)" in SOURCE
assert "if not data.get('ok')" in SOURCE, "explicit QA approval gate is missing"

publish_video = SOURCE.index("os.replace(candidate,out)")
publish_report = SOURCE.index("os.replace(candidate_report,final_report)")
qa_gate = SOURCE.index("if not data.get('ok')")
render_candidate = SOURCE.index("render_motion_text.py'),str(project),str(assets),str(candidate)")
assert render_candidate < qa_gate < publish_video < publish_report

# Failed runs must attempt to clean unpublished candidate artifacts.
finally_pos = SOURCE.rindex("finally:")
assert SOURCE.index("for path in (candidate,candidate_report)", finally_pos) > finally_pos
assert SOURCE.index("path.unlink(missing_ok=True)", finally_pos) > finally_pos

# Bundle extraction must explicitly reject links and special archive entries.
assert "def safe_extract_bundle" in SOURCE
assert "member.issym() or member.islnk()" in SOURCE
assert "not (member.isdir() or member.isfile())" in SOURCE
assert "Ruta duplicada en bundle" in SOURCE

# Demonstrate the same-volume replace contract used by the implementation:
# a pre-existing good output remains untouched until the candidate is published,
# then replacement presents the complete candidate in one filesystem operation.
with tempfile.TemporaryDirectory(prefix="profitmente-atomic-qa-") as td:
    td = pathlib.Path(td)
    final = td / "output.mp4"
    candidate = td / ".output.rendering-test.mp4"
    final.write_bytes(b"previous-good-render")
    candidate.write_bytes(b"new-validated-render")
    assert final.read_bytes() == b"previous-good-render"
    candidate.replace(final)
    assert final.read_bytes() == b"new-validated-render"
    assert not candidate.exists()

# A crafted bundle must be rejected before any render dependency executes. This
# covers the link-traversal class that a plain '..' path check does not stop.
with tempfile.TemporaryDirectory(prefix="profitmente-bundle-safety-") as td:
    td = pathlib.Path(td)
    bundle = td / "malicious.profitmente.tar"
    output = td / "output.mp4"
    with tarfile.open(bundle, "w") as tar:
        project_bytes = b'{"version":"1.9","tracks":{}}'
        info = tarfile.TarInfo("project.json")
        info.size = len(project_bytes)
        tar.addfile(info, io.BytesIO(project_bytes))
        link = tarfile.TarInfo("assets/escape")
        link.type = tarfile.SYMTYPE
        link.linkname = "../../outside"
        tar.addfile(link)
    run = subprocess.run(
        [sys.executable, str(SOURCE_PATH), str(bundle), str(output)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert run.returncode != 0, "malicious symlink bundle was accepted"
    combined = (run.stdout or "") + (run.stderr or "")
    assert "Enlace no permitido en bundle" in combined
    assert not output.exists()

print("Atomic post-QA publication and safe bundle extraction regression OK")
