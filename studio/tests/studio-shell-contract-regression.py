#!/usr/bin/env python3
"""Regression guard for the browser Studio shell.

Keeps the zero-cost editor entry point wired to the controls and engines required
for a usable local workflow. This is intentionally dependency-free so it can run
on Windows and CI with only Python.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")

required_ids = {
    "mediaInput": "media import",
    "mediaLibrary": "media library",
    "previewCanvas": "preview",
    "tracks": "multilayer timeline",
    "saveBtn": "project persistence",
    "generateBtn": "automatic editor",
    "manualBtn": "manual editor",
    "qaBtn": "quality control",
    "bundleBtn": "self-contained export bundle",
    "renderMp4Btn": "local MP4 export",
}
required_scripts = {
    "media-store.js": "persistent media store",
    "preview-engine.js": "preview engine",
    "history-engine.js": "undo/redo history",
    "qa-engine.js": "QA engine",
    "bundle-engine.js": "bundle/export engine",
    "render-job-client.js": "local render client",
    "project-library.js": "project library",
    "generator-integration.js": "automatic editor integration",
    "feature-bootstrap.js": "advanced feature bootstrap",
}

missing = []
for element_id, feature in required_ids.items():
    if not re.search(rf'\bid=["\']{re.escape(element_id)}["\']', html):
        missing.append(f"control #{element_id} ({feature})")
for script, feature in required_scripts.items():
    if not re.search(rf'<script\s+[^>]*src=["\']{re.escape(script)}["\'][^>]*>', html):
        missing.append(f"script {script} ({feature})")

# Paid/network publishing must not become a prerequisite of the Studio shell.
for forbidden in ("stripe.com", "paypal.com", "api.openai.com", "graph.facebook.com", "tiktok.com/v2/post"):
    if forbidden in html.lower():
        missing.append(f"forbidden paid/publishing dependency in index.html: {forbidden}")

if missing:
    raise SystemExit("Studio shell contract regression:\n- " + "\n- ".join(missing))

print(f"PASS: Studio shell keeps {len(required_ids)} core controls and {len(required_scripts)} local engines wired; no paid/publishing dependency detected")
