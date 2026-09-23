"""End-to-end $0 automation pipeline for ProfitMente Studio.

Chains the existing final-QA manifest builder, sealed batch renderer and strict
post-render release gate. It deliberately stops at release-ready local MP4s:
this module never uploads or publishes to social networks.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any, Callable

try:
    from . import automation_batch_gate as batch_gate
    from . import automation_render_batch as batch_render
    from . import automation_release_gate as release_gate
except ImportError:
    import automation_batch_gate as batch_gate
    import automation_render_batch as batch_render
    import automation_release_gate as release_gate


def _reset_run_workspace(work: Path) -> tuple[Path, Path, Path]:
    """Create a clean per-run workspace so stale outputs can never be released."""
    manifest_path = work / "render-manifest.json"
    output_dir = work / "renders"
    quarantine_dir = work / "quarantine"

    if manifest_path.exists():
        manifest_path.unlink()
    for directory in (output_dir, quarantine_dir):
        if directory.exists():
            if directory.is_dir():
                shutil.rmtree(directory)
            else:
                directory.unlink()
        directory.mkdir(parents=True, exist_ok=True)
    return manifest_path, output_dir, quarantine_dir


def run_pipeline(
    inputs: list[str | Path],
    work_dir: str | Path,
    *,
    gate_runner: Callable[..., dict[str, Any]] | None = None,
    render_runner: Callable[..., dict[str, Any]] | None = None,
    release_runner: Callable[..., dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Validate, render and QC projects without publishing anything."""
    work = Path(work_dir).resolve()
    work.mkdir(parents=True, exist_ok=True)
    try:
        manifest_path, output_dir, quarantine_dir = _reset_run_workspace(work)
    except Exception as exc:
        return {"ok": False, "stage": "workspace", "error": str(exc), "release_files": [], "published": False}

    gate_runner = gate_runner or batch_gate.gate_projects
    render_runner = render_runner or batch_render.render_manifest
    release_runner = release_runner or release_gate.gate_batch_result

    try:
        gated = gate_runner(inputs, manifest_path=manifest_path)
    except Exception as exc:
        return {"ok": False, "stage": "preflight", "error": str(exc), "release_files": [], "published": False}
    if gated.get("ok") is not True:
        return {"ok": False, "stage": "preflight", "preflight": gated, "release_files": [], "published": False}

    try:
        rendered = render_runner(manifest_path, output_dir)
    except Exception as exc:
        return {"ok": False, "stage": "render", "preflight": gated, "error": str(exc), "release_files": [], "published": False}
    if rendered.get("ok") is not True:
        return {"ok": False, "stage": "render", "preflight": gated, "render": rendered, "release_files": [], "published": False}

    try:
        released = release_runner(rendered, quarantine_dir)
    except Exception as exc:
        return {"ok": False, "stage": "quality_control", "preflight": gated, "render": rendered, "error": str(exc), "release_files": [], "published": False}

    return {
        "ok": released.get("ok") is True,
        "stage": "complete" if released.get("ok") is True else "quality_control",
        "preflight": gated,
        "render": rendered,
        "release": released,
        "release_files": released.get("release_files", []),
        "published": False,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ProfitMente Studio local $0 automation pipeline")
    parser.add_argument("inputs", nargs="+", help="Project JSON files or directories")
    parser.add_argument("--work-dir", required=True, help="Local pipeline workspace")
    parser.add_argument("--report", help="Optional JSON report path")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)

    report = run_pipeline(args.inputs, args.work_dir)
    if args.report:
        release_gate._atomic_json(Path(args.report), report)
    json.dump(report, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None, allow_nan=False)
    sys.stdout.write("\n")
    return 0 if report.get("ok") is True else 2


if __name__ == "__main__":
    raise SystemExit(main())
