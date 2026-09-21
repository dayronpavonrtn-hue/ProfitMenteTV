#!/usr/bin/env python3
"""Regression guard for the zero-cost Studio new-project reset integration."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
index = (ROOT / "index.html").read_text(encoding="utf-8")
reset = (ROOT / "project-reset-integration.js").read_text(encoding="utf-8")

# The integration must load after the canonical project library so it can wrap,
# rather than replace, the persistence-aware newProject implementation.
lib_tag = '<script src="project-library.js"></script>'
reset_tag = '<script src="project-reset-integration.js"></script>'
assert lib_tag in index, "project-library.js is not loaded"
assert reset_tag in index, "project-reset-integration.js is not loaded"
assert index.index(lib_tag) < index.index(reset_tag), "project reset must load after project library"

required = (
    "const canonicalNewProject = window.ProfitMenteProjects.newProject.bind(window.ProfitMenteProjects)",
    "await canonicalNewProject()",
    "stopPreviewAudio()",
    "window.ProfitMenteTransport.cancel()",
    "window.ProfitMenteHistory.clear()",
    "window.ProfitMenteHistory.capture('Proyecto nuevo')",
    "window.ProfitMenteQA.clear()",
    "window.ProfitMenteGenerator.setTopic('')",
    "window.ProfitMenteTransport.setTime(0)",
    "window.ProfitMenteEditor.render()",
    "window.ProfitMenteEditor.renderAt(0)",
)
for marker in required:
    assert marker in reset, f"missing reset behavior: {marker}"

# Failure must not clear the current editor state: cleanup belongs after the
# canonical persistence-aware operation succeeds.
assert reset.index("await canonicalNewProject()") < reset.index("clearTransientUi()"), (
    "transient UI is cleared before canonical new-project persistence succeeds"
)

print("PASS: new-project persistence ordering and transient editor reset are protected")
