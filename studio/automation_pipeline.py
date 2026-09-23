"""End-to-end $0 automation pipeline for ProfitMente Studio.

Chains the existing final-QA manifest builder, sealed batch renderer and strict
post-render release gate. It deliberately stops at release-ready local MP4s:
this module never uploads or publishes to social networks.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Callable

try:
    from . import automation_preflight_batch as batch_gate
    from . import automation_render_batch as batch_render
    from . import automation_release_gate as release_gate
except ImportError:
    import automation_preflight_batch as batch_gate
    import automation_render_batch as batch_render
    import automation_release_gate as release_gate

_LOCK_NAME = ".profitmente-pipeline.lock"
_MALFORMED_LOCK_MAX_AGE = 86400


def _pid_is_alive(pid: int) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    if pid == os.getpid():
        return True
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        # On platforms where signal 0 is not fully supported, fail closed.
        return True
    return True


def _stale_lock(lock: Path) -> bool:
    """Return True only when an existing lock can be proven stale.

    Normal locks contain the owner PID. A dead PID is safe to reclaim. Legacy
    or malformed locks are reclaimed only after a full day, preventing a parse
    problem from interrupting a legitimate long render.
    """
    try:
        raw = json.loads(lock.read_text(encoding="utf-8"))
        pid = raw.get("pid")
        if isinstance(pid, int) and pid > 0:
            return not _pid_is_alive(pid)
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        pass
    try:
        return time.time() - lock.stat().st_mtime > _MALFORMED_LOCK_MAX_AGE
    except OSError:
        return False


def _acquire_workspace_lock(work: Path) -> Path:
    """Fail closed for active owners, but recover locks left by crashed runs."""
    lock = work / _LOCK_NAME
    payload = json.dumps({"pid": os.getpid(), "created_at": time.time()}, separators=(",", ":"))
    for attempt in range(2):
        try:
            fd = os.open(str(lock), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            break
        except FileExistsError as exc:
            if attempt == 0 and _stale_lock(lock):
                try:
                    lock.unlink()
                except FileNotFoundError:
                    pass
                except OSError as unlink_exc:
                    raise RuntimeError(f"pipeline workspace lock cannot be recovered: {work}") from unlink_exc
                continue
            raise RuntimeError(f"pipeline workspace is already in use: {work}") from exc
    else:  # pragma: no cover - defensive; loop always breaks or raises.
        raise RuntimeError(f"pipeline workspace is already in use: {work}")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        try:
            lock.unlink()
        except OSError:
            pass
        raise
    return lock


def _release_workspace_lock(lock: Path) -> None:
    try:
        lock.unlink()
    except FileNotFoundError:
        pass


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


def run_pipeline(inputs: list[str | Path], work_dir: str | Path, *, gate_runner: Callable[..., dict[str, Any]] | None = None, render_runner: Callable[..., dict[str, Any]] | None = None, release_runner: Callable[..., dict[str, Any]] | None = None) -> dict[str, Any]:
    """Validate, render and QC projects without publishing anything."""
    work = Path(work_dir).resolve()
    work.mkdir(parents=True, exist_ok=True)
    try:
        lock = _acquire_workspace_lock(work)
    except Exception as exc:
        return {"ok": False, "stage": "workspace", "error": str(exc), "release_files": [], "published": False}
    try:
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
        return {"ok": released.get("ok") is True, "stage": "complete" if released.get("ok") is True else "quality_control", "preflight": gated, "render": rendered, "release": released, "release_files": released.get("release_files", []), "published": False}
    finally:
        _release_workspace_lock(lock)


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
