#!/usr/bin/env python3
"""Integrated release gate for the $0 local ProfitMente Studio workflow.

Checks the critical editor/runtime pieces together without paid services:
- browser startup wiring and corrupt-state isolation
- JavaScript editor integrity and automatic mode regressions
- media import/library identity, storage fallback and safe relinking
- multilayer timeline placement and preview freshness
- project persistence/recovery/migration/JSON transfer and portable bundles
- render-job recovery plus legacy project/render compatibility
- export preflight, render-quality/parity configuration and output QC
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
        ("automatico", "Modo automático y autofill", [node, "test_generator_autofill.mjs"]),
        ("medios", "Importación y deduplicación de biblioteca", [node, "test_media_import_engine.mjs"]),
        ("medios", "Preflight y transacción de almacenamiento al importar", [node, "test_media_import_storage_preflight.mjs"]),
        ("medios", "Fallback cuando IndexedDB no está disponible", [node, "test_media_storage_resilience.mjs"]),
        ("medios", "Reconexión verificada por contenido", [node, "relink-content-hash-regression.js"]),
        ("timeline", "Colocación segura en timeline multicapa", [node, "test_media_placement.mjs"]),
        ("timeline", "Locks heredados en colocación de medios", [node, "test_media_placement_legacy_lock.mjs"]),
        ("preview", "Protección contra frames obsoletos", [node, "test_preview_stale_frames.mjs"]),
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
        ("render", "Compatibilidad de estados de pista heredados", [node, "test_track_state_legacy_parity.mjs"]),
        ("render", "Configuración de calidad MP4", [node, "test_render_quality.mjs"]),
        ("render", "Presets de render Python", [py, "test_render_quality.py"]),
        ("render", "Paridad Preview a MP4", [py, "test_render_parity_preflight.py"]),
        ("render", "Render MP4 con pistas heredadas normalizadas", [py, "test_render_mp4_legacy_state.py"]),
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
