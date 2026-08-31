"""Local $0 render quality presets shared by ProfitMente Studio's MP4 renderer."""

PRESETS = {
    'draft': {'id': 'draft', 'preset': 'veryfast', 'crf': '27', 'audio_bitrate': '128k'},
    'standard': {'id': 'standard', 'preset': 'fast', 'crf': '21', 'audio_bitrate': '160k'},
    'high': {'id': 'high', 'preset': 'medium', 'crf': '18', 'audio_bitrate': '192k'},
}


def resolve_render_quality(value='high'):
    key = str(value or 'high').strip().lower()
    if key not in PRESETS:
        key = 'high'
    return dict(PRESETS[key])
