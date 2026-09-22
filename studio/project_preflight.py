"""Zero-cost project preflight for Studio automation and manual exports.

Runs the same export bridge/QA used by final rendering without writing output.
It is intentionally dependency-free so generator/automation jobs can fail closed
before spending time on FFmpeg rendering.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Running a file inside ``studio/`` directly puts that directory, not the repo
# root, on sys.path. Add the root explicitly so the exact same imports work for
# both ``python -m studio.project_preflight`` and the convenient direct command.
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from studio.export_pipeline import build_export


def inspect_project(project: dict[str, Any], *, final: bool = True) -> dict[str, Any]:
    """Return a stable machine-readable preflight result; never leak a traceback."""
    try:
        result = build_export(project, final=final)
    except (TypeError, ValueError) as exc:
        return {
            "ok": False,
            "stage": "validation",
            "blockers": [str(exc)],
            "warnings": [],
        }

    qa = result.get("qa") if isinstance(result, dict) else None
    qa = qa if isinstance(qa, dict) else {}
    blockers = qa.get("blockers") if isinstance(qa.get("blockers"), list) else []
    warnings = qa.get("warnings") if isinstance(qa.get("warnings"), list) else []
    ready = bool(result.get("ok")) and not blockers
    return {
        "ok": ready,
        "stage": "ready" if ready else "qa",
        "blockers": [str(item) for item in blockers],
        "warnings": [str(item) for item in warnings],
        "summary": {
            "assets": len(project.get("assets", [])) if isinstance(project.get("assets"), list) else 0,
            "clips": len(project.get("clips", [])) if isinstance(project.get("clips"), list) else 0,
            "duration": project.get("duration"),
        },
    }


def inspect_file(path: str | Path, *, final: bool = True) -> dict[str, Any]:
    source = Path(path)
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return {"ok": False, "stage": "load", "blockers": [f"No se pudo cargar el proyecto: {exc}"], "warnings": []}
    if not isinstance(payload, dict):
        return {"ok": False, "stage": "load", "blockers": ["El archivo de proyecto debe contener un objeto JSON."], "warnings": []}
    return inspect_project(payload, final=final)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ProfitMente Studio project preflight")
    parser.add_argument("project", help="Ruta al proyecto JSON")
    parser.add_argument("--draft", action="store_true", help="Usar QA de borrador en vez de exportación final")
    parser.add_argument("--pretty", action="store_true", help="Formatear la salida JSON")
    args = parser.parse_args(argv)
    report = inspect_file(args.project, final=not args.draft)
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None)
    sys.stdout.write("\n")
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
