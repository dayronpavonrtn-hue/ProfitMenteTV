"""Strict $0 post-render release gate for ProfitMente Studio automation.

Consumes the JSON result produced by automation_render_batch, re-runs the full
local output_qc inspection for every successful render, and only returns files
that are safe to hand to a later publishing step. Failed-QC outputs are moved
out of the release directory into a quarantine directory. This module never
uploads or publishes content and uses only local FFmpeg/ffprobe through
output_qc.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any, Callable

try:
    from .output_qc import inspect_output
except ImportError:
    from output_qc import inspect_output


def _atomic_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(f".{path.name}.tmp")
    text = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    try:
        temp.write_text(text, encoding="utf-8")
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def _unique_quarantine_path(directory: Path, source: Path) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    candidate = directory / source.name
    counter = 2
    while candidate.exists():
        candidate = directory / f"{source.stem}-{counter}{source.suffix}"
        counter += 1
    return candidate


def gate_batch_result(
    batch_result: dict[str, Any],
    quarantine_dir: str | Path,
    *,
    inspector: Callable[[Path, Path], dict[str, Any]] = inspect_output,
) -> dict[str, Any]:
    """Run full QC on completed renders and quarantine every rejected output."""
    rows = batch_result.get("results")
    if not isinstance(rows, list):
        raise ValueError("El resultado de render no contiene una lista results válida.")

    quarantine = Path(quarantine_dir).resolve()
    results: list[dict[str, Any]] = []
    released: list[str] = []

    for row in rows:
        if not isinstance(row, dict):
            results.append({"ok": False, "error": "Entrada de render inválida.", "project": None, "output": None})
            continue
        project_text = row.get("project")
        output_text = row.get("output")
        if row.get("ok") is not True:
            results.append({"ok": False, "project": project_text, "output": None, "error": row.get("error") or "Render previo fallido.", "qc": None})
            continue
        if not isinstance(project_text, str) or not project_text or not isinstance(output_text, str) or not output_text:
            results.append({"ok": False, "project": project_text, "output": None, "error": "Render exitoso sin project/output válido.", "qc": None})
            continue

        project = Path(project_text).resolve()
        output = Path(output_text).resolve()
        if not project.is_file() or not output.is_file():
            results.append({"ok": False, "project": str(project), "output": None, "error": "Proyecto o MP4 no disponible para QC final.", "qc": None})
            continue

        try:
            qc = inspector(project, output)
        except Exception as exc:  # fail closed: release automation must never guess
            qc = {"ok": False, "score": 0, "issues": [f"QC final no pudo ejecutarse: {exc}"], "warnings": [], "metrics": {}}

        if qc.get("ok") is True:
            released.append(str(output))
            results.append({"ok": True, "project": str(project), "output": str(output), "error": None, "qc": qc})
            continue

        quarantined = None
        try:
            target = _unique_quarantine_path(quarantine, output)
            shutil.move(str(output), str(target))
            quarantined = str(target)
        except OSError as exc:
            # Still fail closed. If quarantine fails, never list the file as released.
            qc.setdefault("issues", []).append(f"No se pudo poner el MP4 rechazado en cuarentena: {exc}")
        results.append({"ok": False, "project": str(project), "output": None, "quarantined": quarantined, "error": "MP4 rechazado por QC final.", "qc": qc})

    passed = sum(1 for item in results if item.get("ok") is True)
    failed = len(results) - passed
    return {"ok": bool(results) and failed == 0, "total": len(results), "released": passed, "failed": failed, "release_files": released, "results": results}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ProfitMente Studio strict post-render release gate ($0 local)")
    parser.add_argument("batch_result", help="JSON producido por automation_render_batch.py")
    parser.add_argument("quarantine_dir", help="Carpeta para MP4 rechazados")
    parser.add_argument("--report", help="Guardar reporte JSON de forma atómica")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    try:
        payload = json.loads(Path(args.batch_result).read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("El resultado de render debe ser un objeto JSON.")
        report = gate_batch_result(payload, args.quarantine_dir)
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
        report = {"ok": False, "total": 0, "released": 0, "failed": 0, "release_files": [], "results": [], "error": str(exc)}
    if args.report:
        _atomic_json(Path(args.report), report)
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None, allow_nan=False)
    sys.stdout.write("\n")
    return 0 if report.get("ok") is True else 2


if __name__ == "__main__":
    raise SystemExit(main())
