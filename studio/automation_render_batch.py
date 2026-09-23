"""Execute sealed ProfitMente Studio render manifests locally at $0.

The executor refuses stale/non-final manifests before starting FFmpeg, renders
sequentially to temporary files, and only publishes completed MP4s atomically.
Existing MP4 exports are never overwritten. Render jobs have a bounded runtime
so a stalled FFmpeg process cannot freeze an automatic batch indefinitely. It
never uploads or publishes to social networks.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

try:
    from .automation_preflight_batch import verify_manifest_file
except ImportError:
    from automation_preflight_batch import verify_manifest_file

DEFAULT_RENDER_TIMEOUT_SECONDS = 3600


def _load_manifest(path: str | Path) -> dict[str, Any]:
    source = Path(path)
    report = verify_manifest_file(source)
    if report.get("ok") is not True:
        detail = "; ".join(str(item) for item in report.get("errors", [])) or "manifiesto inválido"
        raise ValueError(f"Render bloqueado por manifiesto: {detail}")
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"No se pudo cargar el manifiesto: {exc}") from exc
    return payload


def _safe_output_name(project_path: Path, used: set[str]) -> str:
    base = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in project_path.stem).strip("_") or "project"
    candidate = f"{base}.mp4"
    counter = 2
    while candidate.lower() in used:
        candidate = f"{base}-{counter}.mp4"
        counter += 1
    used.add(candidate.lower())
    return candidate


def render_manifest(
    manifest_path: str | Path,
    assets_dir: str | Path,
    output_dir: str | Path,
    *,
    runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
    renderer: str | Path | None = None,
    timeout_seconds: int = DEFAULT_RENDER_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int) or timeout_seconds < 1:
        raise ValueError("timeout_seconds debe ser un entero mayor que 0")
    payload = _load_manifest(manifest_path)
    assets = Path(assets_dir).resolve()
    if not assets.is_dir():
        raise ValueError(f"Carpeta de medios no encontrada: {assets}")
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    renderer_path = Path(renderer).resolve() if renderer else Path(__file__).with_name("render_mp4.py").resolve()
    if not renderer_path.is_file():
        raise ValueError(f"Renderer no encontrado: {renderer_path}")

    results: list[dict[str, Any]] = []
    # Reserve names already present on disk so a new batch can never destroy a
    # previously successful export. This also handles case-insensitive filesystems.
    used: set[str] = {item.name.lower() for item in destination.iterdir() if item.is_file()}
    for entry in payload["projects"]:
        project = Path(entry["path"]).resolve()
        name = _safe_output_name(project, used)
        final = destination / name
        temp = destination / f".{name}.part.mp4"
        try:
            temp.unlink(missing_ok=True)
            completed = runner(
                [sys.executable, str(renderer_path), str(project), str(assets), str(temp)],
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            if completed.returncode != 0:
                temp.unlink(missing_ok=True)
                detail = (completed.stderr or completed.stdout or "render falló").strip()
                results.append({"project": str(project), "ok": False, "output": None, "error": detail[-2000:]})
                continue
            if not temp.is_file() or temp.stat().st_size <= 0:
                temp.unlink(missing_ok=True)
                results.append({"project": str(project), "ok": False, "output": None, "error": "El renderer no produjo un MP4 válido."})
                continue
            os.replace(temp, final)
            results.append({"project": str(project), "ok": True, "output": str(final), "error": None})
        except subprocess.TimeoutExpired:
            temp.unlink(missing_ok=True)
            results.append({
                "project": str(project),
                "ok": False,
                "output": None,
                "error": f"Render cancelado al superar {timeout_seconds} segundos.",
            })
        except OSError as exc:
            temp.unlink(missing_ok=True)
            results.append({"project": str(project), "ok": False, "output": None, "error": str(exc)})

    completed_count = sum(1 for item in results if item["ok"])
    return {
        "ok": bool(results) and completed_count == len(results),
        "total": len(results),
        "completed": completed_count,
        "failed": len(results) - completed_count,
        "results": results,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ProfitMente Studio sealed batch renderer ($0 local)")
    parser.add_argument("manifest", help="Manifiesto FINAL-QA sellado")
    parser.add_argument("assets_dir", help="Carpeta local de medios")
    parser.add_argument("output_dir", help="Carpeta de salida MP4")
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=DEFAULT_RENDER_TIMEOUT_SECONDS,
        help=f"Límite por video antes de cancelar FFmpeg (default: {DEFAULT_RENDER_TIMEOUT_SECONDS}s)",
    )
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = render_manifest(
            args.manifest,
            args.assets_dir,
            args.output_dir,
            timeout_seconds=args.timeout_seconds,
        )
    except (ValueError, OSError) as exc:
        result = {"ok": False, "total": 0, "completed": 0, "failed": 0, "results": [], "error": str(exc)}
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None, allow_nan=False)
    sys.stdout.write("\n")
    return 0 if result.get("ok") is True else 2


if __name__ == "__main__":
    raise SystemExit(main())
