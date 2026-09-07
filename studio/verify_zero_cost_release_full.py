#!/usr/bin/env python3
"""Unified local ProfitMente Studio $0 release gate.

Runs the existing integrated release verifier first, then the CI-only regression
checks that protect interactive editing and final MP4 signal quality. Everything
is deterministic and local: no API keys, paid services, or social publishing.

Usage:
    python studio/verify_zero_cost_release_full.py
"""
from __future__ import annotations

import pathlib
import shutil
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent


def require(binary: str) -> str:
    path = shutil.which(binary)
    if not path:
        raise SystemExit(f"FALTA REQUISITO: {binary} no está disponible en PATH")
    return path


def run(label: str, command: list[str]) -> None:
    started = time.time()
    print(f"\n[QA:FULL] {label}", flush=True)
    print("          " + " ".join(command), flush=True)
    completed = subprocess.run(command, cwd=ROOT, text=True)
    if completed.returncode != 0:
        raise SystemExit(f"FALLO [FULL]: {label} (código {completed.returncode})")
    print(f"[OK:FULL] {label} ({time.time() - started:.2f}s)", flush=True)


def main() -> None:
    node = require("node")
    require("ffmpeg")
    require("ffprobe")
    py = sys.executable

    # First run the broad integrated gate. The checks below intentionally mirror
    # every additional zero-cost GitHub workflow guard so a local PASS has the
    # same practical meaning as CI PASS.
    run("Gate integral ProfitMente Studio $0", [py, "verify_zero_cost_release.py"])

    parity_checks = [
        ("Fallback B-roll offline mantiene costo $0", [py, "tests/test_zero_cost_broll.py"]),
        ("Inspector respeta locks e identidad de clips", [node, "test_clip_lock_track_inspector.mjs"]),
        ("Reporte QA renderiza datos de forma segura", [node, "test_qa_report_safe_render.mjs"]),
        ("Studio carga y activa el renderer QA seguro", [node, "test_studio_qa_report_integration.mjs"]),
        ("Timeline renderiza contenido de forma segura", [node, "test_timeline_safe_render.mjs"]),
        ("Transporte del Preview conserva estado resiliente", [node, "test_transport_engine.mjs"]),
        ("Snapping magnético conserva identidad canónica", [node, "test_timeline_snap.mjs"]),
        ("Source Monitor respeta rangos, duración e identidad legacy", [node, "test_source_monitor.mjs"]),
        ("Match Frame conserva mapeo de fuente", [node, "test_match_frame.mjs"]),
        ("Trim izquierdo conserva ventana de fuente", [node, "test_timeline_left_trim.mjs"]),
        ("Trim derecho conserva ventana de fuente", [node, "test_timeline_right_trim.mjs"]),
        ("Waveform de timeline coincide con ventana editada y reemplazos", [node, "test_waveform_timeline_parity.mjs"]),
        ("Reemplazo de medios conserva seguridad y duración legacy", [node, "test_media_replace_engine.mjs"]),
        ("Generador y autofill conservan identidades canónicas", [node, "test_generator_identity.mjs"]),
        ("Preview de audio conserva identidad canónica", [node, "test_audio_engine_identity.mjs"]),
        ("Smart Mix conserva estado de audio y automatización segura", [node, "test_smart_mix_engine.mjs"]),
        ("Checkpoints automáticos deduplican y limitan versiones", [node, "test_automation_checkpoint.mjs"]),
        ("Auto Finish crea checkpoint antes de mutar o renderizar", [node, "test_automation_checkpoint_wiring.mjs"]),
        ("Ducking temporal aparece en el MP4 final", [py, "test_audio_ducking_render.py"]),
        ("Envolventes y fades aparecen en el MP4 final", [py, "test_audio_envelope_render.py"]),
        ("MP4 final decodifica completamente", [py, "test_verify_render_decode.py"]),
        ("QC detecta negro, silencio y congelamientos", [py, "test_output_signal_qc.py"]),
        ("QC valida loudness final", [py, "test_output_loudness_qc.py"]),
    ]

    started = time.time()
    for label, command in parity_checks:
        run(label, command)

    print(
        f"\nPROFITMENTE STUDIO $0 FULL LOCAL/CI PARITY GATE: PASS "
        f"({len(parity_checks) + 1} grupos, {time.time() - started:.2f}s adicionales)"
    )
    print("Servicios de pago: NO | Publicación social: NO")


if __name__ == "__main__":
    main()
