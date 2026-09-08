#!/usr/bin/env python3
"""Reject ambiguous/corrupt clip identities before local MP4 rendering."""
from __future__ import annotations

import json
import math
import pathlib
import re
import sys

_NUMERIC = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$")


def canonical_clip_id(value):
    """Mirror Studio's strict scalar identity rules without JSON coercion."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value) or not value.is_integer():
            return None
        value = int(value)
        return "0" if value == 0 else str(value)
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    if _NUMERIC.fullmatch(raw):
        try:
            number = float(raw)
        except ValueError:
            return raw
        if math.isfinite(number) and number.is_integer():
            integer = int(number)
            return "0" if integer == 0 else str(integer)
    return raw


def inspect_clip_identities(project):
    errors = []
    clips = project.get("clips", []) if isinstance(project, dict) else []
    if not isinstance(clips, list):
        return {"ok": False, "errors": ["clips debe ser una lista"], "clips": 0}

    seen = {}
    for index, clip in enumerate(clips):
        if not isinstance(clip, dict):
            continue
        raw = clip.get("id")
        canonical = canonical_clip_id(raw)
        if canonical is None:
            errors.append(f"Clip {index}: id inválido")
            continue
        if canonical in seen:
            first = seen[canonical]
            errors.append(
                f"Identidad de clip ambigua: clips {first} y {index} representan el mismo id canónico {canonical}"
            )
        else:
            seen[canonical] = index
    return {"ok": not errors, "errors": errors, "clips": len(clips)}


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 1:
        raise SystemExit("Usage: clip_identity_preflight.py project.json")
    path = pathlib.Path(argv[0])
    project = json.loads(path.read_text(encoding="utf-8"))
    report = inspect_clip_identities(project)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["ok"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
