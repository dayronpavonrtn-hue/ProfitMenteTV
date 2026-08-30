#!/usr/bin/env python3
"""Post-render quality control for ProfitMente Studio MP4 outputs.
Uses local ffprobe + FFmpeg only. No network or paid services.
"""
from __future__ import annotations
import json
import pathlib
import re
import subprocess
import sys

TARGETS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}
BLACK_RE = re.compile(r"black_start:(?P<start>[0-9.]+)\s+black_end:(?P<end>[0-9.]+)\s+black_duration:(?P<duration>[0-9.]+)")
SILENCE_START_RE = re.compile(r"silence_start:\s*(?P<start>[0-9.]+)")
SILENCE_END_RE = re.compile(r"silence_end:\s*(?P<end>[0-9.]+)\s*\|\s*silence_duration:\s*(?P<duration>[0-9.]+)")
FREEZE_START_RE = re.compile(r"freeze_start:\s*(?P<start>[0-9.]+)")
FREEZE_DURATION_RE = re.compile(r"freeze_duration:\s*(?P<duration>[0-9.]+)")
FREEZE_END_RE = re.compile(r"freeze_end:\s*(?P<end>[0-9.]+)")


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
        if clip.get("muted"):
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
        expected_fps = int(round(_num(project.get("fps"), 30)))
        expected_fps = expected_fps if expected_fps in (24, 30, 60) else 30
        if fps and abs(fps - expected_fps) > 0.25:
            issues.append(f"Frame rate final {fps:.2f} FPS; esperado {expected_fps} FPS.")

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


def parse_blackdetect(log: str) -> list[dict]:
    return [
        {"start": _num(m.group("start")), "end": _num(m.group("end")), "duration": _num(m.group("duration"))}
        for m in BLACK_RE.finditer(log or "")
    ]


def parse_silencedetect(log: str, total_duration: float = 0.0) -> list[dict]:
    events, pending = [], None
    for line in (log or "").splitlines():
        start_match = SILENCE_START_RE.search(line)
        if start_match:
            pending = _num(start_match.group("start"))
        end_match = SILENCE_END_RE.search(line)
        if end_match:
            end = _num(end_match.group("end")); duration = _num(end_match.group("duration"))
            start = pending if pending is not None else max(0.0, end - duration)
            events.append({"start": start, "end": end, "duration": duration})
            pending = None
    if pending is not None and total_duration > pending:
        events.append({"start": pending, "end": total_duration, "duration": total_duration - pending})
    return events


def parse_freezedetect(log: str, total_duration: float = 0.0) -> list[dict]:
    events, pending_start, pending_duration = [], None, None
    for line in (log or "").splitlines():
        start_match = FREEZE_START_RE.search(line)
        if start_match:
            pending_start = _num(start_match.group("start"))
            pending_duration = None
        duration_match = FREEZE_DURATION_RE.search(line)
        if duration_match:
            pending_duration = _num(duration_match.group("duration"))
        end_match = FREEZE_END_RE.search(line)
        if end_match:
            end = _num(end_match.group("end"))
            duration = pending_duration if pending_duration is not None else max(0.0, end - _num(pending_start))
            start = pending_start if pending_start is not None else max(0.0, end - duration)
            events.append({"start": start, "end": end, "duration": duration})
            pending_start, pending_duration = None, None
    if pending_start is not None and total_duration > pending_start:
        end = total_duration
        duration = pending_duration if pending_duration is not None else end - pending_start
        events.append({"start": pending_start, "end": end, "duration": duration})
    return events


def _signal_summary(events: list[dict]) -> tuple[float, float]:
    total = sum(max(0.0, _num(x.get("duration"))) for x in events)
    longest = max([_num(x.get("duration")) for x in events] or [0.0])
    return total, longest


def analyze_signals(project: dict, duration: float, black_events: list[dict], silence_events: list[dict], freeze_events: list[dict] | None = None) -> dict:
    duration = max(0.25, _num(duration, _num(project.get("duration"), 45)))
    freeze_events = freeze_events or []
    black_total, black_longest = _signal_summary(black_events)
    silence_total, silence_longest = _signal_summary(silence_events)
    freeze_total, freeze_longest = _signal_summary(freeze_events)
    issues, warnings = [], []

    severe_black = max(3.0, duration * 0.40)
    warn_black = max(1.25, duration * 0.12)
    if black_longest >= severe_black:
        issues.append(f"El render contiene una pantalla negra continua de {black_longest:.2f}s.")
    elif black_longest >= warn_black:
        warnings.append(f"Se detectó una pantalla negra continua de {black_longest:.2f}s; conviene revisarla.")

    severe_freeze = max(5.0, duration * 0.50)
    warn_freeze = max(2.0, duration * 0.20)
    if freeze_longest >= severe_freeze or freeze_total >= duration * 0.80:
        issues.append(f"El render parece congelado durante {freeze_total:.2f}s (tramo máximo {freeze_longest:.2f}s).")
    elif freeze_longest >= warn_freeze:
        warnings.append(f"Se detectó imagen congelada durante {freeze_longest:.2f}s; conviene revisar ese tramo.")

    if project_expects_audio(project):
        severe_silence = max(4.0, duration * 0.60)
        warn_silence = max(2.0, duration * 0.25)
        if silence_longest >= severe_silence or silence_total >= duration * 0.85:
            issues.append(f"El render tiene audio silencioso durante {silence_total:.2f}s (tramo máximo {silence_longest:.2f}s).")
        elif silence_longest >= warn_silence:
            warnings.append(f"Se detectó un tramo de audio silencioso de {silence_longest:.2f}s.")

    return {
        "issues": issues,
        "warnings": warnings,
        "metrics": {
            "black_seconds": round(black_total, 3),
            "longest_black": round(black_longest, 3),
            "freeze_seconds": round(freeze_total, 3),
            "longest_freeze": round(freeze_longest, 3),
            "silence_seconds": round(silence_total, 3),
            "longest_silence": round(silence_longest, 3),
        },
    }


def probe_file(mp4: pathlib.Path) -> dict:
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(mp4)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError((result.stderr or "ffprobe falló").strip())
    return json.loads(result.stdout or "{}")


def scan_output(mp4: pathlib.Path, duration: float, scan_audio: bool) -> tuple[list[dict], list[dict], list[dict], list[str]]:
    warnings = []
    black_events, silence_events, freeze_events = [], [], []
    black = subprocess.run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
        "-vf", "blackdetect=d=0.75:pix_th=0.10", "-an", "-f", "null", "-"
    ], capture_output=True, text=True)
    if black.returncode == 0:
        black_events = parse_blackdetect(black.stderr)
    else:
        warnings.append("No se pudo ejecutar la detección local de pantallas negras.")

    freeze = subprocess.run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
        "-vf", "freezedetect=n=-60dB:d=1.5", "-an", "-f", "null", "-"
    ], capture_output=True, text=True)
    if freeze.returncode == 0:
        freeze_events = parse_freezedetect(freeze.stderr, duration)
    else:
        warnings.append("No se pudo ejecutar la detección local de imagen congelada.")

    if scan_audio:
        silence = subprocess.run([
            "ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4),
            "-vn", "-af", "silencedetect=noise=-45dB:d=1.5", "-f", "null", "-"
        ], capture_output=True, text=True)
        if silence.returncode == 0:
            silence_events = parse_silencedetect(silence.stderr, duration)
        else:
            warnings.append("No se pudo ejecutar la detección local de silencio.")
    return black_events, silence_events, freeze_events, warnings


def inspect_output(project_path: pathlib.Path, mp4_path: pathlib.Path) -> dict:
    project = json.loads(project_path.read_text(encoding="utf-8"))
    if not mp4_path.is_file():
        return {"ok": False, "score": 0, "issues": ["El MP4 final no existe."], "warnings": [], "metrics": {}}
    probe = probe_file(mp4_path)
    report = analyze_probe(project, probe)
    duration = _num(report.get("metrics", {}).get("duration"), _num(project.get("duration"), 45))
    black_events, silence_events, freeze_events, scan_warnings = scan_output(
        mp4_path, duration, bool(report.get("metrics", {}).get("has_audio")) and project_expects_audio(project)
    )
    signal = analyze_signals(project, duration, black_events, silence_events, freeze_events)
    report["issues"].extend(signal["issues"])
    report["warnings"].extend(signal["warnings"])
    report["warnings"].extend(scan_warnings)
    report["metrics"].update(signal["metrics"])
    report["ok"] = not report["issues"]
    report["score"] = max(0, 100 - 25 * len(report["issues"]) - 5 * len(report["warnings"]))
    return report


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
