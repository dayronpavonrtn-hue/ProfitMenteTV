"""Zero-cost local render quality profiles for ProfitMente Studio."""

PROFILES = {
    "draft": {
        "id": "draft",
        "label": "Borrador rápido",
        "preset": "veryfast",
        "crf": 25,
        "audio_bitrate": "128k",
    },
    "standard": {
        "id": "standard",
        "label": "Estándar",
        "preset": "medium",
        "crf": 18,
        "audio_bitrate": "192k",
    },
    "high": {
        "id": "high",
        "label": "Alta calidad",
        "preset": "slow",
        "crf": 16,
        "audio_bitrate": "256k",
    },
}

DEFAULT_PROFILE = "standard"


def resolve_profile(value=None):
    key = str(value or DEFAULT_PROFILE).strip().lower()
    return dict(PROFILES.get(key, PROFILES[DEFAULT_PROFILE]))
