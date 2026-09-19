#!/usr/bin/env python3
"""Unified local ProfitMente Studio $0 release gate.

Runs the existing integrated release verifier first, then the CI-only regression
checks that protect interactive editing, persistence, bundle safety and final
export signal quality. Everything is deterministic and local: no API keys, paid
services, or social publishing.

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

    run("Gate integral ProfitMente Studio $0", [py, "verify_zero_cost_release.py"])

    parity_checks = [
        ("Fallback B-roll offline mantiene costo $0", [py, "tests/test_zero_cost_broll.py"]),
        ("Inspector respeta locks e identidad de clips", [node, "test_clip_lock_track_inspector.mjs"]),
        ("Edición avanzada rechaza identidades de pista inválidas", [node, "test_advanced_edit_lock_guard.mjs"]),
        ("Reporte QA renderiza datos de forma segura", [node, "test_qa_report_safe_render.mjs"]),
        ("Studio carga y activa el renderer QA seguro", [node, "test_studio_qa_report_integration.mjs"]),
        ("Timeline renderiza contenido de forma segura", [node, "test_timeline_safe_render.mjs"]),
        ("Importación de proyecto normaliza FPS para preview/render", [node, "test_project_import_fps.mjs"]),
        ("Inicio recupera FPS canónico del proyecto", [node, "tests/startup-project-fps-regression.js"]),
        ("Transporte del Preview conserva estado resiliente", [node, "test_transport_engine.mjs"]),
        ("Preview espera el frame decodificado solicitado", [node, "preview-seek-regression.test.js"]),
        ("Coordinador de Preview descarta solicitudes obsoletas", [node, "test_preview_render_coordinator.mjs"]),
        ("Preview interpreta flags booleanos de forma estricta", [node, "test_preview_boolean_flags.mjs"]),
        ("Snapping magnético conserva identidad canónica", [node, "test_timeline_snap.mjs"]),
        ("Timeline normaliza aliases de pistas y locks heredados", [node, "test_timeline_track_state_alias.mjs"]),
        ("Timeline aplica locks con flags estrictos", [node, "tests/timeline-lock-strict-flags-regression.js"]),
        ("Source Monitor respeta rangos, duración e identidad legacy", [node, "test_source_monitor.mjs"]),
        ("Match Frame conserva mapeo de fuente", [node, "test_match_frame.mjs"]),
        ("Trim izquierdo conserva ventana de fuente", [node, "test_timeline_left_trim.mjs"]),
        ("Trim derecho conserva ventana de fuente", [node, "test_timeline_right_trim.mjs"]),
        ("Waveform de timeline coincide con ventana editada y reemplazos", [node, "test_waveform_timeline_parity.mjs"]),
        ("Biblioteca protege medios usados por otros proyectos", [node, "test_media_library_cross_project_guard.mjs"]),
        ("Biblioteca conserva búsqueda, filtros y borrado después del inspector", [node, "test_media_library_inspector_rebind.mjs"]),
        ("Reemplazo de medios conserva seguridad y duración legacy", [node, "test_media_replace_engine.mjs"]),
        ("Importación de bundle revierte escrituras rechazadas", [node, "tests/bundle-import-rejected-media-write-rollback-regression.js"]),
        ("Importación de bundle revierte escrituras parciales", [node, "tests/bundle-import-partial-write-rollback-regression.js"]),
        ("Importación de bundle exige pre-guardado seguro", [node, "tests/bundle-import-presave-regression.js"]),
        ("WebM bloquea exportación si la persistencia no es segura", [node, "tests/webm-storage-safety-regression.js"]),
        ("MP4 bloquea exportación si la persistencia no es segura", [node, "tests/mp4-persistence-safety-regression.mjs"]),
        ("Generador y autofill conservan identidades canónicas", [node, "test_generator_identity.mjs"]),
        ("Preview de audio conserva identidad canónica", [node, "test_audio_engine_identity.mjs"]),
        ("Smart Mix conserva estado de audio y automatización segura", [node, "test_smart_mix_engine.mjs"]),
        ("Auto Finish interpreta mute importado de forma estricta", [node, "test_auto_finish_strict_mute.mjs"]),
        ("QA interpreta flags booleanos de forma estricta", [node, "test_qa_strict_boolean_flags.js"]),
        ("QA rechaza escalares numéricos ambiguos", [node, "test_qa_numeric_scalar_guard.js"]),
        ("QA de render bloquea valores temporales no finitos", [py, "test_render_qa_nonfinite.py"]),
        ("Validador rechaza números no canónicos", [py, "test_validate_project_strict_numeric.py"]),
        ("Render MP4 interpreta flags booleanos de forma estricta", [py, "test_render_clip_boolean_flags.py"]),
        ("Preflight valida audio embebido de clips visuales", [py, "test_source_audio_preflight.py"]),
        ("Preflight conserva IDs numéricos de medios y narración", [node, "../tools/test_export_preflight_media_ids.js"]),
        ("Preflight de narración rechaza timing e identidades ambiguas", [node, "test_export_preflight_identity.mjs"]),
        ("Pipeline final valida referencias, controles, mute y límites de fuente", [py, "test_export_pipeline.py"]),
        ("Checkpoints automáticos deduplican y limitan versiones", [node, "test_automation_checkpoint.mjs"]),
        ("Auto Finish crea checkpoint antes de mutar o renderizar", [node, "test_automation_checkpoint_wiring.mjs"]),
        ("Render iniciado usa snapshot estable aunque el proyecto siga editándose", [node, "test_render_snapshot.mjs"]),
        ("WebM usa resolución final, bitrate correcto y estado inmutable", [node, "test_webm_render_state.mjs"]),
        ("Exportación final rechaza metadatos inválidos de medios referenciados", [py, "tests/export-media-metadata-regression.py"]),
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
