#!/usr/bin/env python3
"""Integrated release gate for the $0 local ProfitMente Studio workflow.

Checks the critical editor/runtime pieces together without paid services:
- JavaScript editor integrity and automatic mode regressions
- project persistence/recovery
- render-quality configuration
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


def run(label: str, command: list[str]) -> dict:
    started = time.time()
    print(f"\n[QA] {label}", flush=True)
    print("     " + " ".join(command), flush=True)
    completed = subprocess.run(command, cwd=ROOT, text=True)
    elapsed = round(time.time() - started, 2)
    if completed.returncode != 0:
        raise SystemExit(f"FALLO: {label} (código {completed.returncode})")
    print(f"[OK] {label} ({elapsed}s)", flush=True)
    return {"name": label, "seconds": elapsed, "ok": True}


def main() -> None:
    node = require("node")
    require("ffmpeg")
    require("ffprobe")
    py = sys.executable

    checks = [
        ("Integridad general del editor", [node, "test_studio_integrity.mjs"]),
        ("Modo automático y autofill", [node, "test_generator_autofill.mjs"]),
        ("Persistencia/autosave", [node, "test_project_autosave.mjs"]),
        ("Recuperación de proyectos", [node, "test_recovery.mjs"]),
        ("Configuración de calidad MP4", [node, "test_render_quality.mjs"]),
        ("Presets de render Python", [py, "test_render_quality.py"]),
        ("API local de Studio", [py, "test_server_api.py"]),
        ("Render MP4 real end-to-end", [py, "smoke_test.py"]),
    ]

    results = []
    started = time.time()
    for label, command in checks:
        results.append(run(label, command))

    summary = {
        "ok": True,
        "profile": "ProfitMente Studio $0 local",
        "checks": len(results),
        "seconds": round(time.time() - started, 2),
        "paid_services": False,
        "social_publish": False,
        "results": results,
    }
    print("\n" + json.dumps(summary, ensure_ascii=False, indent=2))
    print("\nPROFITMENTE STUDIO $0 RELEASE GATE: PASS")


if __name__ == "__main__":
    main()
