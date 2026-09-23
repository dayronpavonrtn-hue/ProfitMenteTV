#!/usr/bin/env python3
"""Regression guard for critical ProfitMente Studio browser script ordering.

The Studio is intentionally dependency-free and uses classic browser scripts, so
load order is part of the runtime contract. This check is local-only and catches
an easy-to-miss class of regressions where an integration silently becomes a
no-op because its engine was loaded later.
"""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.srcs = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        src = dict(attrs).get("src")
        if src:
            self.srcs.append(src)


parser = Scripts()
parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
scripts = parser.srcs
positions = {name: i for i, name in enumerate(scripts)}

required = [
    "audio-engine.js",
    "bundle-engine.js",
    "startup-project-guard.js",
    "media-store.js",
    "media-placement-integration.js",
    "app.js",
    "project-import-engine.js",
    "project-library.js",
    "project-import-integration.js",
    "feature-bootstrap.js",
    "webm-render-guard.js",
]
missing = [name for name in required if name not in positions]
assert not missing, f"Studio perdió scripts críticos: {', '.join(missing)}"

before = [
    ("audio-engine.js", "app.js"),
    ("startup-project-guard.js", "app.js"),
    ("media-store.js", "app.js"),
    ("media-placement-integration.js", "app.js"),
    ("bundle-engine.js", "app.js"),
    ("project-import-engine.js", "project-import-integration.js"),
    ("project-library.js", "project-import-integration.js"),
    ("feature-bootstrap.js", "webm-render-guard.js"),
]
for dependency, consumer in before:
    assert positions[dependency] < positions[consumer], (
        f"Orden de scripts inválido: {dependency} debe cargar antes de {consumer}"
    )

assert len(scripts) == len(set(scripts)), "index.html carga uno o más scripts externos dos veces"
print("runtime script order regression: PASS")
