#!/usr/bin/env python3
"""Regression guard for the zero-cost Studio new-project reset integration."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
index = (ROOT / "index.html").read_text(encoding="utf-8")
reset = (ROOT / "project-reset-integration.js").read_text(encoding="utf-8")
projects = (ROOT / "project-library.js").read_text(encoding="utf-8")

# The advanced reset loads after the persistence-aware project library. It may
# extend that controller, but must never bypass its save-before-switch path.
lib_tag = '<script src="project-library.js"></script>'
reset_tag = '<script src="project-reset-integration.js"></script>'
assert lib_tag in index, "project-library.js is not loaded"
assert reset_tag in index, "project-reset-integration.js is not loaded"
assert index.index(lib_tag) < index.index(reset_tag), "project reset must load after project library"

# Protect the canonical project transition contract exposed by project-library.
for marker in (
    "function flushCurrentProject()",
    "async function newProject()",
    "stopPlayback();if(!flushCurrentProject())return false",
    "project=ProfitMenteProjectLibrary.blank()",
    "window.ProfitMenteNewProject={create:newProject,flushCurrentProject}",
):
    assert marker in projects, f"missing canonical new-project behavior: {marker}"

# The integration must use that controller first. Transient editor cleanup is
# intentionally performed only after create() confirms the persistence-aware
# transition, so a failed save leaves the current editor state untouched.
for marker in (
    "window.ProfitMenteNewProject?.create",
    "window.ProfitMenteNewProject?.flushCurrentProject",
    "const created=await window.ProfitMenteNewProject.create()",
    "if(!created)return",
    "await refreshBlankProject()",
    "clearTransientUi()",
    "window.profitMenteProjectReset=engine",
):
    assert marker in reset, f"missing reset integration behavior: {marker}"

create_at = reset.index("const created=await window.ProfitMenteNewProject.create()")
confirm_at = reset.index("if(!created)return", create_at)
refresh_at = reset.index("await refreshBlankProject()", confirm_at)
assert create_at < confirm_at < refresh_at, "editor cleanup can run before canonical project creation succeeds"

# Keep the compatibility fallback transactional as well: it retains the old
# project, attempts local persistence, and restores both project and playhead if
# storage rejects the blank project.
for marker in (
    "const previousProject=project",
    "const previousPlayhead=Number(document.querySelector('#playhead')?.value||0)",
    "project=previousProject",
    "previousPlayhead",
    "Proyecto nuevo cancelado: no se pudo confirmar el guardado local",
):
    assert marker in reset, f"missing transactional fallback behavior: {marker}"

print("PASS: new-project persistence ordering, transient reset and rollback are protected")
