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

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from studio.export_pipeline import build_export


def _json_safe(value: Any) -> Any:
    """Return stable JSON-safe diagnostic data without hiding preflight failures."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return str(value)


def inspect_project(project: dict[str, Any], *, final: bool = True) -> dict[str, Any]:
    """Return a stable machine-readable preflight result; never leak a traceback."""
    try:
        result = build_export(project, final=final)
    except (TypeError, ValueError) as exc:
        return {"ok": False, "stage": "validation", "blockers": [str(exc)], "warnings": []}
    except Exception as exc:
        detail = str(exc).strip() or exc.__class__.__name__
        return {
            "ok": False,
            "stage": "internal",
            "blockers": [f"Preflight interno bloqueó el render: {detail}"],
            "warnings": [],
        }

    if not isinstance(result, dict):
        return {
            "ok": False,
            "stage": "internal",
            "blockers": ["Preflight interno devolvió un resultado inválido."],
            "warnings": [],
        }

    qa = result.get("qa")
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
            "duration": _json_safe(project.get("duration")),
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
    try:
        json.dump(_json_safe(report), sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None, allow_nan=False)
        sys.stdout.write("\n")
    except (TypeError, ValueError) as exc:
        fallback = {"ok": False, "stage": "internal", "blockers": [f"No se pudo serializar el preflight: {exc}"], "warnings": []}
        json.dump(fallback, sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        return 2
    return 0 if report.get("ok") is True else 2


if __name__ == "__main__":
    raise SystemExit(main())
