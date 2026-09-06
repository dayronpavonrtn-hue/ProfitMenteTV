#!/usr/bin/env python3
"""Integrated release gate for the $0 local ProfitMente Studio workflow.

Checks the critical editor/runtime pieces together without paid services:
- browser startup wiring and corrupt-state isolation
- JavaScript editor integrity and automatic mode regressions
- media import/library identity, storage fallback, safe relinking, readability and cleanup
- multilayer timeline placement, legacy track aliases and preview freshness
- advanced manual edits honoring clip/track locks, including legacy aliases
- synchronized ripple/remove-time edits for clips, captions, markers and work ranges
- project persistence/recovery/migration/JSON transfer and portable bundles
- render-job recovery, resilient result delivery and legacy project/render compatibility
- export preflight, render-quality/parity configuration, failure cleanup and output QC
- local server API
- real FFmpeg end-to-end MP4 smoke render

Usage:
    python studio/verify_zero_cost_release.py
"""
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent


def require(binary: str) -> str:
    path = shutil.which(binary)
    if not path:
        raise SystemExit(
            f"FALTA REQUISITO: {binary}. "
            + ("Instala Node.js para ejecutar el QA de desarrollo." if binary == "node" else "Instala FFmpeg gratis y asegúrate de que esté en PATH.")
        )
    return path


def run(area: str, label: str, command: list[str]) -> dict:
    started = time.time()
    print(f"\n[QA:{area}] {label}", flush=True)
    print("     " + " ".join(command), flush=True)
    completed = subprocess.run(command, cwd=ROOT, text=True)
    elapsed = round(time.time() - started, 2)
    if completed.returncode != 0:
        raise SystemExit(f"FALLO [{area}]: {label} (código {completed.returncode})")
    print(f"[OK:{area}] {label} ({elapsed}s)", flush=True)
    return {"area": area, "name": label, "seconds": elapsed, "ok": True}


def main() -> None:
    node = require("node")
    require("ffmpeg")
    require("ffprobe")
    py = sys.executable

    # This list intentionally mirrors the user's $0 release requirements. Keep
    # every check deterministic and local so the gate never needs API keys,
    # premium services, network publishing, or social credentials.
    checks = [
        ("inicio", "Carga real de herramientas avanzadas", [node, "test_feature_bootstrap_wiring.mjs"]),
        ("inicio", "Aislamiento de proyecto corrupto al arrancar", [node, "test_startup_corruption_guard.mjs"]),
        ("editor", "Integridad general del editor", [node, "test_studio_integrity.mjs"]),
        ("editor", "Corrección de color manual normaliza presets y filtros de Preview/FFmpeg", [node, "test_color_grade.mjs"]),
        ("editor", "Identidad canónica de medios y pistas en el núcleo", [node, "test_core_app_identity.mjs"]),
        ("editor", "Identidad canónica del clip en herramientas manuales", [node, "test_edit_tools_clip_identity.mjs"]),
        ("editor", "Copiar, pegar y duplicar preservan aislamiento de grupos", [node, "test_clipboard_engine.mjs"]),
        ("editor", "Edición agrupada duplica y elimina sin romper locks", [node, "test_group_edit.mjs"]),
        ("editor", "Arrastre agrupado mantiene offsets y restricciones", [node, "test_group_drag.mjs"]),
        ("editor", "Split de clips vinculados conserva sincronía de grupo", [node, "test_group_split.mjs"]),
        ("editor", "Edición avanzada respeta locks y alias heredados", [node, "test_advanced_edit_lock_guard.mjs"]),
        ("editor", "Locks de clips y grupos con alias heredados", [node, "test_clip_lock.mjs"]),
        ("editor", "Remove-time sincroniza clips, captions, marcadores y rango", [node, "test_remove_time.mjs"]),
        ("automatico", "Modo automático y autofill", [node, "test_generator_autofill.mjs"]),
        ("automatico", "Motor automático protege IDs 0 y locks heredados", [node, "test_generator_engine_guards.mjs"]),
        ("automatico", "Auto Finish planifica el flujo local completo", [node, "test_auto_finish_engine.mjs"]),
        ("automatico", "Auto Finish revierte cambios parciales de forma atómica", [node, "test_auto_finish_atomicity.mjs"]),
        ("automatico", "Auto Finish espera el render local antes de continuar", [node, "test_auto_finish_render_wait.mjs"]),
        ("automatico", "Transiciones automáticas respetan locks, gaps y aliases heredados", [node, "test_auto_transition_engine.mjs"]),
        ("automatico", "Duración automática de transiciones coincide entre Preview y Render", [node, "test_transition_duration.mjs"]),
        ("medios", "Importación y deduplicación de biblioteca", [node, "test_media_import_engine.mjs"]),
        ("medios", "Proxies locales respetan identidad canónica de medios", [node, "test_media_proxy_engine.mjs"]),
        ("medios", "Preflight y transacción de almacenamiento al importar", [node, "test_media_import_storage_preflight.mjs"]),
        ("medios", "Inspección de medios falla segura ante decoder colgado o corrupto", [node, "test_media_readability_qa.mjs"]),
        ("medios", "Identidad canónica sin colisiones antes del render", [py, "test_media_identity_collision.py"]),
        ("calidad", "Preflight del editor bloquea colisiones de IDs de medios", [node, "test_qa_media_identity_collision.mjs"]),
        ("calidad", "QA resuelve identidad canónica antes de validar medios", [node, "test_qa_canonical_media_identity.mjs"]),
        ("medios", "Fallback cuando IndexedDB no está disponible", [node, "test_media_storage_resilience.mjs"]),
        ("medios", "Reconexión verificada por contenido", [node, "relink-content-hash-regression.js"]),
        ("medios", "Reconexión preserva identidad canónica y media ID 0", [node, "relink-manifest-regression.js"]),
        ("medios", "Limpieza conserva medios usados y aliases entre proyectos", [node, "test_media_library_cleanup.mjs"]),
        ("timeline", "Colocación segura en timeline multicapa", [node, "test_media_placement.mjs"]),
        ("timeline", "Drag-and-drop de biblioteca respeta identidad y pistas heredadas", [node, "test_media_timeline_dnd.mjs"]),
        ("timeline", "Locks heredados en colocación de medios", [node, "test_media_placement_legacy_lock.mjs"]),
        ("timeline", "Alias heredados de pista en operaciones manuales", [node, "test_timeline_track_alias_guard.mjs"]),
        ("preview", "Identidad legacy de medios coincide con render", [node, "test_preview_media_identity.mjs"]),
        ("preview", "Audio preview respeta identidad de medios y estados heredados", [node, "test_audio_preview_identity.mjs"]),
        ("preview", "Waveform respeta identidad de medios y aliases de pistas", [node, "test_audio_waveform_engine.mjs"]),
        ("preview", "Waveform se recupera si el decoder de audio queda colgado", [node, "test_audio_waveform_decode_timeout.mjs"]),
        ("audio", "Ducking respeta IDs 0 y aliases de pistas heredadas", [node, "test_audio_ducking.mjs"]),
        ("audio", "Normalización respeta IDs 0 y aliases de pistas heredadas", [node, "test_audio_normalize_identity.mjs"]),
        ("audio", "Recorte de silencios respeta identidad, aliases y locks heredados", [node, "test_audio_silence_engine.mjs"]),
        ("audio", "Envolventes y fades respetan identidad y locks heredados", [node, "test_audio_envelope_engine.mjs"]),
        ("preview", "Protección contra frames obsoletos", [node, "test_preview_stale_frames.mjs"]),
        ("preview", "Captions asíncronos no reaparecen tras mover el cursor", [node, "test_caption_preview_stale_frames.mjs"]),
        ("proyectos", "Persistencia/autosave", [node, "test_project_autosave.mjs"]),
        ("proyectos", "Recuperación de proyectos", [node, "test_recovery.mjs"]),
        ("proyectos", "Persistencia después de restaurar recuperación", [node, "test_recovery_restore_persistence.mjs"]),
        ("proyectos", "Migración canónica de proyectos heredados", [node, "test_project_migration.mjs"]),
        ("proyectos", "Importación JSON heredada segura", [node, "test_project_import.mjs"]),
        ("proyectos", "Transferencia JSON segura", [node, "project-transfer-regression.test.js"]),
        ("portabilidad", "Paquete con identidad de medios", [node, "test_bundle_media_identity.mjs"]),
        ("portabilidad", "Preflight de espacio al restaurar paquete completo", [node, "test_bundle_import_storage_preflight.mjs"]),
        ("exportacion", "Preflight antes de exportar", [node, "test_export_preflight.mjs"]),
        ("render", "Recuperación de trabajo MP4 tras recarga/red", [node, "test_render_job_recovery.mjs"]),
        ("render", "Trabajos de render reemplazados quedan aislados del trabajo activo", [node, "test_render_job_supersede.mjs"]),
        ("render", "Descarga MP4 reintenta fallos transitorios y valida integridad", [node, "test_render_result_retry.mjs"]),
        ("render", "Render asíncrono conserva sesión recuperable y exige QA post-render", [node, "test_async_render_validation.mjs"]),
        ("render", "Integración de paquete MP4 usa el cliente resiliente de trabajos", [node, "test_bundle_render_job_integration.mjs"]),
        ("render", "Identidad canónica de medios mantiene vigente el render correcto", [node, "test_render_media_identity.mjs"]),
        ("render", "Puente Studio conserva decisiones manuales y aliases hacia el motor existente", [py, "test_studio_bridge.py"]),
        ("render", "Compatibilidad de estados de pista heredados", [node, "test_track_state_legacy_parity.mjs"]),
        ("render", "Configuración de calidad MP4", [node, "test_render_quality.mjs"]),
        ("render", "Presets de render Python", [py, "test_render_quality.py"]),
        ("render", "Paridad Preview a MP4", [py, "test_render_parity_preflight.py"]),
        ("render", "Corrección de color manual se conserva en el MP4 final", [py, "test_color_grade_render.py"]),
        ("render", "Primer clip no recibe transición de entrada en MP4", [py, "test_first_clip_transition_render.py"]),
        ("render", "Render MP4 con pistas heredadas normalizadas", [py, "test_render_mp4_legacy_state.py"]),
        ("render", "Fallos de render liberan archivos temporales", [py, "test_render_failure_cleanup.py"]),
        ("servidor", "API local de Studio", [py, "test_server_api.py"]),
        ("exportacion", "Render MP4 real end-to-end", [py, "smoke_test.py"]),
        ("calidad", "Control de calidad del MP4 final", [py, "test_output_qc.py"]),
    ]

    results = []
    started = time.time()
    for area, label, command in checks:
        results.append(run(area, label, command))

    by_area: dict[str, int] = {}
    for result in results:
        by_area[result["area"]] = by_area.get(result["area"], 0) + 1

    summary = {
        "ok": True,
        "profile": "ProfitMente Studio $0 local",
        "checks": len(results),
        "areas": by_area,
        "seconds": round(time.time() - started, 2),
        "paid_services": False,
        "social_publish": False,
        "results": results,
    }
    print("\n" + json.dumps(summary, ensure_ascii=False, indent=2))
    print("\nPROFITMENTE STUDIO $0 RELEASE GATE: PASS")


if __name__ == "__main__":
    main()
