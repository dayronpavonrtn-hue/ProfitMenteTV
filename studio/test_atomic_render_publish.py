#!/usr/bin/env python3
"""Regression guard for atomic publication of final MP4 renders."""
from __future__ import annotations
import ast
import pathlib
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

print("Atomic post-QA render publication regression OK")
