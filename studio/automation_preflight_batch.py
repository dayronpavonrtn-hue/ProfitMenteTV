"""Batch preflight gate for zero-cost ProfitMente Studio automation.

Validates one or more project JSON files with the same project preflight used by
manual export. It can emit a render manifest containing only projects that are
safe to hand to the local renderer. No network or paid service is used.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable

try:
    from .project_preflight import inspect_file
except ImportError:  # direct script execution
    from project_preflight import inspect_file


def discover(inputs: Iterable[str], *, recursive: bool = False) -> list[Path]:
    found: dict[str, Path] = {}
    for raw in inputs:
        path = Path(raw).expanduser()
        if path.is_file():
            if path.suffix.lower() == ".json":
                found[str(path.resolve())] = path.resolve()
            continue
        if path.is_dir():
            pattern = "**/*.json" if recursive else "*.json"
            for candidate in path.glob(pattern):
                if candidate.is_file():
                    found[str(candidate.resolve())] = candidate.resolve()
    return [found[key] for key in sorted(found)]


def inspect_many(paths: Iterable[Path], *, final: bool = True) -> dict[str, Any]:
    projects: list[dict[str, Any]] = []
    ready: list[str] = []
    blocked: list[str] = []
    for path in paths:
        report = inspect_file(path, final=final)
        item = {"path": str(path), **report}
        projects.append(item)
        (ready if report.get("ok") is True else blocked).append(str(path))
    return {
        "ok": bool(projects) and not blocked,
        "total": len(projects),
        "ready": len(ready),
        "blocked": len(blocked),
        "projects": projects,
        "render_manifest": ready,
    }


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temp.replace(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ProfitMente Studio batch automation preflight")
    parser.add_argument("inputs", nargs="+", help="Proyecto(s) JSON o carpetas")
    parser.add_argument("--recursive", action="store_true", help="Buscar JSON también en subcarpetas")
    parser.add_argument("--draft", action="store_true", help="Usar QA de borrador")
    parser.add_argument("--manifest", help="Guardar manifiesto JSON con proyectos listos para render")
    parser.add_argument("--report", help="Guardar el reporte completo en JSON")
    parser.add_argument("--pretty", action="store_true", help="Formatear salida JSON")
    args = parser.parse_args(argv)

    paths = discover(args.inputs, recursive=args.recursive)
    result = inspect_many(paths, final=not args.draft)
    if not paths:
        result["reason"] = "No se encontraron proyectos JSON."

    if args.manifest:
        _write_json(Path(args.manifest), {"version": 1, "projects": result["render_manifest"]})
    if args.report:
        _write_json(Path(args.report), result)

    json.dump(result, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None, allow_nan=False)
    sys.stdout.write("\n")
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
