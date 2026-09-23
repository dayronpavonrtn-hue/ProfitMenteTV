#!/usr/bin/env python3
"""Static regression gate for Studio media placement wiring.

This stays dependency-free so it can run locally and in GitHub Actions at $0.
It protects the contract between the media-placement helper and studio/app.js.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLACEMENT = (ROOT / "studio" / "media-placement-integration.js").read_text(encoding="utf-8")
APP = (ROOT / "studio" / "app.js").read_text(encoding="utf-8")
INDEX = (ROOT / "studio" / "index.html").read_text(encoding="utf-8")


def require(text: str, needle: str, where: str) -> None:
    if needle not in text:
        raise AssertionError(f"Missing {needle!r} in {where}")


# Helper contract: sanitize assets, infer track kind and return explicit result.
for needle in (
    "window.ProfitMenteMediaPlacement",
    "function sanitizeMediaAsset",
    "function trackKindForAsset",
    "function placeAssetInTimeline",
    "findCompatibleTrack",
    "findTimelineSlot",
    "ensureProjectDurationForClip",
    "createTimelineClip",
    "persistProject",
    "refreshTimeline",
    "refreshPreview",
):
    require(PLACEMENT, needle, "studio/media-placement-integration.js")

# Integration contract: app delegates placement to the helper and supplies the
# live Studio callbacks rather than duplicating placement logic.
for needle in (
    "ProfitMenteMediaPlacement.placeAssetInTimeline",
    "findCompatibleTrack:",
    "findTimelineSlot:",
    "ensureProjectDurationForClip:",
    "createTimelineClip:",
    "persistProject:",
    "refreshTimeline:",
    "refreshPreview:",
):
    require(APP, needle, "studio/app.js")

# The browser must load the helper before app.js.
helper_pos = INDEX.find("media-placement-integration.js")
app_pos = INDEX.find("app.js")
if helper_pos < 0 or app_pos < 0 or helper_pos >= app_pos:
    raise AssertionError("media-placement-integration.js must load before app.js")

print("OK: Studio media placement integration regression gate passed")
