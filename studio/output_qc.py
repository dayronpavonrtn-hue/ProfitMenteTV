#!/usr/bin/env python3
"""Post-render quality control for ProfitMente Studio MP4 outputs.
Uses local ffprobe only. No network or paid services.
"""
from __future__ import annotations
import json
import pathlib
import subprocess
import sys

TARGETS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}


def _num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _fps(value):
    try:
        a, b = str(value or "0/1").split("/", 1)
        b = float(b)
        return float(a) / b if b else 0.0
    except (ValueError, ZeroDivisionError):
        return 0.0


def project_expects_audio(project: dict) -> bool:
    tracks = project.get("trackState") if isinstance(project.get("trackState"), dict) else {}
    for clip in project.get("clips", []):
        try:
            track = int(clip.get("track", 0))
        except (TypeError, ValueError):
            track = 0
        state = tracks.get(str(track), tracks.get(track, {}))
        if isinstance(state, dict) and state.get("muted"):
            continue
        if track >= 4 and _num(clip.get("duration")) > 0:
            return True
    return False


def analyze_probe(project: dict, probe: dict) -> dict:
    streams = probe.get("streams") if isinstance(probe.get("streams"), list) else []
    fmt = probe.get("format") if isinstance(probe.get("format"), dict) else {}
    videos = [s for s in streams if s.get("codec_type") == "video"]
    audios = [s for s in streams if s.get("codec_type") == "audio"]
    issues, warnings = [], []
    video = videos[0] if videos else {}
    expected_w, expected_h = TARGETS.get(project.get("format", "9:16"), TARGETS["9:16"])
    expected_duration = max(0.25, _num(project.get("duration"), 45))
    duration = _num(fmt.get("duration"), _num(video.get("duration")))
    width, height = int(_num(video.get("width"))), int(_num(video.get("height")))
    fps = _fps(video.get("avg_frame_rate") or video.get("r_frame_rate"))
    vcodec = str(video.get("codec_name") or "")
    acodec = str(audios[0].get("codec_name") or "") if audios else ""
    pix_fmt = str(video.get("pix_fmt") or "")

    if not videos:
        issues.append("El archivo final no contiene una pista de video.")
    else:
        if (width, height) != (expected_w, expected_h):
            issues.append(f"Resolución final incorrecta: {width}×{height}; esperada {expected_w}×{expected_h}.")
        if vcodec not in ("h264", "avc1"):
            warnings.append(f"Codec de video inesperado: {vcodec or 'desconocido'}; se recomienda H.264.")
        if pix_fmt and pix_fmt not in ("yuv420p", "yuvj420p"):
            warnings.append(f"Formato de píxel {pix_fmt} puede reducir compatibilidad en redes sociales.")
        if fps and not (24 <= fps <= 60):
            warnings.append(f"Frame rate inusual: {fps:.2f} FPS.")

    tolerance = max(0.75, expected_duration * 0.03)
    if duration <= 0:
        issues.append("No se pudo verificar la duración del MP4 final.")
    elif abs(duration - expected_duration) > tolerance:
        issues.append(f"Duración final {duration:.2f}s fuera de tolerancia; proyecto {expected_duration:.2f}s.")

    wants_audio = project_expects_audio(project)
    if wants_audio and not audios:
        issues.append("El proyecto contiene audio activo pero el MP4 final no tiene pista de audio.")
    elif audios and acodec != "aac":
        warnings.append(f"Codec de audio inesperado: {acodec}; se recomienda AAC.")

    size = int(_num(fmt.get("size")))
    if size <= 0:
        issues.append("El MP4 final está vacío o ffprobe no informó su tamaño.")
    elif size < 10_000:
        warnings.append("El MP4 final es anormalmente pequeño; conviene revisarlo visualmente.")

    score = max(0, 100 - 25 * len(issues) - 5 * len(warnings))
    return {
        "ok": not issues,
        "score": score,
        "issues": issues,
        "warnings": warnings,
        "metrics": {
            "width": width,
            "height": height,
            "duration": round(duration, 3),
            "expected_duration": expected_duration,
            "fps": round(fps, 3),
            "video_codec": vcodec,
            "audio_codec": acodec or None,
            "pixel_format": pix_fmt or None,
            "size": size,
            "has_audio": bool(audios),
        },
    }


def probe_file(mp4: pathlib.Path) -> dict:
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(mp4)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError((result.stderr or "ffprobe falló").strip())
    return json.loads(result.stdout or "{}")


def inspect_output(project_path: pathlib.Path, mp4_path: pathlib.Path) -> dict:
    project = json.loads(project_path.read_text(encoding="utf-8"))
    if not mp4_path.is_file():
        return {"ok": False, "score": 0, "issues": ["El MP4 final no existe."], "warnings": [], "metrics": {}}
    return analyze_probe(project, probe_file(mp4_path))


def main():
    if len(sys.argv) not in (3, 4):
        raise SystemExit("Usage: output_qc.py project.json output.mp4 [report.json]")
    report = inspect_output(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
    text = json.dumps(report, ensure_ascii=False, indent=2)
    print(text)
    if len(sys.argv) == 4:
        pathlib.Path(sys.argv[3]).write_text(text, encoding="utf-8")
    if not report["ok"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
