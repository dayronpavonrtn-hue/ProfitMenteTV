#!/usr/bin/env python3
"""Zero-cost local media ingest for ProfitMente Studio projects.

Uses ffprobe when available, never uploads media, and writes project JSON atomically.
This gives the manual/automatic editor one deterministic ingestion boundary before
preview, timeline placement and render.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import mimetypes
import os
import subprocess
import tempfile
from pathlib import Path

MAX_MEDIA_BYTES = 8 * 1024 * 1024 * 1024
SUPPORTED = {"image", "video", "audio"}


def _finite(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _kind(mime: str, streams: list[dict]) -> str | None:
    for stream in streams:
        codec_type = str(stream.get("codec_type") or "").lower()
        if codec_type == "video":
            # ffprobe reports still images as video streams. MIME is authoritative
            # for common image imports so Studio does not treat PNG/JPEG as timed.
            return "image" if mime.startswith("image/") else "video"
        if codec_type == "audio":
            return "audio"
    prefix = mime.split("/", 1)[0]
    return prefix if prefix in SUPPORTED else None


def probe(path: str | os.PathLike, ffprobe: str = "ffprobe") -> dict:
    source = Path(path).expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Medio no encontrado: {source}")
    size = source.stat().st_size
    if size <= 0:
        raise ValueError(f"Medio vacío: {source.name}")
    if size > MAX_MEDIA_BYTES:
        raise ValueError(f"Medio demasiado grande ({size} bytes): {source.name}")

    mime = (mimetypes.guess_type(source.name)[0] or "application/octet-stream").lower()
    command = [
        ffprobe, "-v", "error", "-show_entries",
        "format=duration,format_name:stream=codec_type,codec_name,width,height,duration",
        "-of", "json", str(source),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=30, check=False)
    except FileNotFoundError as exc:
        raise RuntimeError("ffprobe no está instalado o no está disponible en PATH.") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"ffprobe agotó el tiempo al inspeccionar {source.name}.") from exc
    if completed.returncode != 0:
        detail = (completed.stderr or "archivo no decodificable").strip().splitlines()[-1]
        raise ValueError(f"No se pudo decodificar {source.name}: {detail}")
    try:
        payload = json.loads(completed.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise ValueError(f"ffprobe devolvió metadatos inválidos para {source.name}.") from exc

    streams = payload.get("streams") if isinstance(payload.get("streams"), list) else []
    kind = _kind(mime, streams)
    if kind not in SUPPORTED:
        raise ValueError(f"Tipo de medio no soportado: {source.name} ({mime})")

    digest = hashlib.sha256()
    with source.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    asset_id = "media-" + digest.hexdigest()[:20]
    asset = {
        "id": asset_id,
        "name": source.name,
        "type": kind,
        "mime": mime,
        "path": str(source),
        "size": size,
        "mediaReadable": True,
        "sha256": digest.hexdigest(),
    }

    format_data = payload.get("format") if isinstance(payload.get("format"), dict) else {}
    durations = [_finite(format_data.get("duration"))]
    durations.extend(_finite(stream.get("duration")) for stream in streams if isinstance(stream, dict))
    duration = max((item for item in durations if item is not None and item > 0), default=None)
    if kind in {"video", "audio"}:
        if duration is None:
            raise ValueError(f"Medio temporizado sin duración válida: {source.name}")
        asset["duration"] = duration

    visual = next((s for s in streams if isinstance(s, dict) and s.get("codec_type") == "video"), None)
    if visual:
        width, height = _finite(visual.get("width")), _finite(visual.get("height"))
        if width and width > 0:
            asset["width"] = int(width)
        if height and height > 0:
            asset["height"] = int(height)
    return asset


def ingest(project: dict, paths: list[str], ffprobe: str = "ffprobe") -> tuple[dict, list[dict]]:
    if not isinstance(project, dict):
        raise TypeError("Proyecto inválido")
    assets = project.get("assets")
    if assets is None:
        assets = []
        project["assets"] = assets
    if not isinstance(assets, list):
        raise ValueError("La biblioteca de medios del proyecto es inválida.")
    existing = {str(a.get("id")) for a in assets if isinstance(a, dict) and a.get("id") is not None}
    added = []
    for path in paths:
        asset = probe(path, ffprobe=ffprobe)
        if asset["id"] in existing:
            continue
        assets.append(asset)
        existing.add(asset["id"])
        added.append(asset)
    return project, added


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)
    except BaseException:
        try:
            os.unlink(temp)
        except FileNotFoundError:
            pass
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa medios locales a un proyecto ProfitMente Studio sin servicios de pago.")
    parser.add_argument("project", type=Path)
    parser.add_argument("media", nargs="+")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    try:
        project = json.loads(args.project.read_text(encoding="utf-8")) if args.project.exists() else {"assets": [], "clips": []}
        project, added = ingest(project, args.media, ffprobe=args.ffprobe)
        atomic_write(args.project, project)
    except (OSError, ValueError, TypeError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"Media ingest FAILED: {exc}", file=os.sys.stderr)
        return 2
    print(f"Media ingest OK: {len(added)} medio(s) nuevo(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
