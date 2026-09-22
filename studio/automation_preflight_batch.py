"""Batch preflight gate for zero-cost ProfitMente Studio automation.

Validates projects with the same preflight used by manual export. Render
manifests contain only approved projects and seal their bytes with SHA-256 so a
renderer can reject projects changed after preflight. No network is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Iterable

try:
    from .project_preflight import inspect_file
except ImportError:
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
    return {"ok": bool(projects) and not blocked, "total": len(projects), "ready": len(ready),
            "blocked": len(blocked), "projects": projects, "render_manifest": ready}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(paths: Iterable[str | Path]) -> dict[str, Any]:
    projects = []
    for raw in paths:
        path = Path(raw).resolve()
        projects.append({"path": str(path), "sha256": _sha256(path)})
    return {"version": 2, "algorithm": "sha256", "projects": projects}


def verify_manifest_entry(entry: dict[str, Any]) -> bool:
    if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
        return False
    expected = entry.get("sha256")
    if not isinstance(expected, str) or len(expected) != 64:
        return False
    try:
        return _sha256(Path(entry["path"])) == expected.lower()
    except OSError:
        return False


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
    parser.add_argument("--manifest", help="Guardar manifiesto sellado con proyectos listos para render")
    parser.add_argument("--report", help="Guardar el reporte completo en JSON")
    parser.add_argument("--pretty", action="store_true", help="Formatear salida JSON")
    args = parser.parse_args(argv)

    paths = discover(args.inputs, recursive=args.recursive)
    result = inspect_many(paths, final=not args.draft)
    if not paths:
        result["reason"] = "No se encontraron proyectos JSON."
    if args.manifest:
        try:
            _write_json(Path(args.manifest), build_manifest(result["render_manifest"]))
        except OSError as exc:
            result["ok"] = False
            result.setdefault("manifest_errors", []).append(f"No se pudo sellar el manifiesto: {exc}")
    if args.report:
        _write_json(Path(args.report), result)
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None, allow_nan=False)
    sys.stdout.write("\n")
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())