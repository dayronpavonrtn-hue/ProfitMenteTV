#!/usr/bin/env python3
"""Regression guard for the local ProfitMente Studio $0 FULL release gate.

This is intentionally a fast static check: GitHub Actions already runs the
individual regressions. Here we make sure the one-command local FULL gate does
not silently drop the critical recent safety checks that protect persistence,
imports, preview/timeline state and final exports.
"""
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
FULL_GATE = ROOT / "verify_zero_cost_release_full.py"

REQUIRED_CHECKS = (
    "verify_zero_cost_release.py",
    "tests/startup-project-fps-regression.js",
    "tests/timeline-lock-strict-flags-regression.js",
    "tests/bundle-import-rejected-media-write-rollback-regression.js",
    "tests/bundle-import-partial-write-rollback-regression.js",
    "tests/bundle-import-presave-regression.js",
    "tests/webm-storage-safety-regression.js",
    "tests/mp4-persistence-safety-regression.mjs",
    "test_preview_boolean_flags.mjs",
    "test_auto_finish_strict_mute.mjs",
    "test_qa_strict_boolean_flags.js",
    "test_qa_numeric_scalar_guard.js",
    "test_validate_project_strict_numeric.py",
    "test_render_clip_boolean_flags.py",
    "test_export_pipeline.py",
    "test_render_snapshot.mjs",
    "test_webm_render_state.mjs",
    "test_audio_ducking_render.py",
    "test_audio_envelope_render.py",
    "test_verify_render_decode.py",
    "test_output_signal_qc.py",
    "test_output_loudness_qc.py",
)

REQUIRED_ZERO_COST_MARKERS = (
    "Servicios de pago: NO | Publicación social: NO",
    'require("ffmpeg")',
    'require("ffprobe")',
)


def main() -> None:
    source = FULL_GATE.read_text(encoding="utf-8")
    missing = [item for item in (*REQUIRED_CHECKS, *REQUIRED_ZERO_COST_MARKERS) if item not in source]
    if missing:
        print("FALLO: el gate FULL $0 perdió protecciones obligatorias:")
        for item in missing:
            print(f"  - {item}")
        raise SystemExit(1)

    print(
        "PASS: gate FULL $0 conserva persistencia, rollback, preview/timeline, "
        "pipeline final, render y QC críticos sin servicios de pago."
    )


if __name__ == "__main__":
    main()
