#!/usr/bin/env python3
"""Validate that the zero-cost Studio feature bootstrap only references real modules.

This catches a class of browser-only failures where feature-bootstrap.js advertises
an advanced editor feature but the referenced engine/integration file was renamed,
deleted, duplicated, or ordered before its engine dependency.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "feature-bootstrap.js").read_text(encoding="utf-8")

# The module table uses ['file.js', 'Guard'] entries. Limit extraction to quoted
# JS filenames so helper strings outside the table do not become false positives.
modules = re.findall(r"\[\s*['\"]([^'\"]+\.js)['\"]\s*,", source)
if not modules:
    raise SystemExit("feature bootstrap contract: no modules discovered")

errors = []
seen = set()
for module in modules:
    if module in seen:
        errors.append(f"duplicate bootstrap module: {module}")
    seen.add(module)
    path = ROOT / module
    if not path.is_file():
        errors.append(f"missing bootstrap module: {module}")
    elif path.stat().st_size == 0:
        errors.append(f"empty bootstrap module: {module}")

# For conventional engine/integration pairs, the engine must be requested first.
positions = {name: index for index, name in enumerate(modules)}
for integration, integration_pos in positions.items():
    if not integration.endswith("-integration.js"):
        continue
    engine = integration.replace("-integration.js", "-engine.js")
    if engine in positions and positions[engine] > integration_pos:
        errors.append(f"dependency order: {integration} loads before {engine}")

# These capabilities are part of the current usable editor contract and must not
# silently disappear from the lazy bootstrap.
required = {
    "media-import-engine.js",
    "media-metadata-engine.js",
    "generator-autofill.js",
    "timeline-snap-engine.js",
    "preview-render-coordinator.js",
    "audio-normalize-engine.js",
    "audio-qc-engine.js",
    "project-autosave.js",
    "render-snapshot-engine.js",
    "render-queue-engine.js",
    "render-progress-engine.js",
    "auto-finish-engine.js",
    "automation-checkpoint.js",
}
for module in sorted(required - seen):
    errors.append(f"required advanced feature not bootstrapped: {module}")

if errors:
    raise SystemExit("Studio feature bootstrap regression:\n- " + "\n- ".join(errors))

print(f"PASS: {len(modules)} advanced Studio modules exist, are unique, and preserve engine/integration ordering")
