import json
from pathlib import Path

ROOT = Path(__file__).parent
STYLE = json.loads((ROOT / 'v5_style.json').read_text(encoding='utf-8'))


def build_edit_plan(timeline):
    """Convert narrative timeline into a multi-track CapCut-style edit plan."""
    tracks = {k: [] for k in ('video','overlay','motion','captions','sfx','music','voice')}
    for i, shot in enumerate(timeline):
        start = float(shot['start'])
        end = float(shot['end'])
        kind = shot.get('kind', 'value')
        tracks['video'].append({
            'start': start, 'end': end, 'scene': shot.get('scene', i),
            'transition': 'flash' if kind == 'hook' else ('whip' if i % 3 == 0 else 'cut'),
            'zoom_from': 1.0, 'zoom_to': 1.09 if kind == 'hook' else 1.055,
        })
        tracks['captions'].append({
            'start': start, 'end': end, 'text': shot.get('text',''),
            'animation': 'pop_word', 'highlight_keywords': True,
        })
        if kind == 'hook' or i % 4 == 0:
            tracks['motion'].append({
                'start': start, 'end': min(end, start + 0.8),
                'type': 'keyword_card', 'text': shot.get('keyword', shot.get('text','')),
                'animation': 'scale_in',
            })
            tracks['sfx'].append({'time': start, 'type': 'whoosh' if i else 'impact'})
    tracks['music'].append({'start': 0, 'end': timeline[-1]['end'] if timeline else 0, 'duck_under_voice': True, 'gain_db': -22})
    tracks['voice'].append({'start': 0, 'source': 'output/voice.mp3', 'gain_db': 0})
    return {
        'format': {'width': STYLE['quality']['width'], 'height': STYLE['quality']['height'], 'fps': STYLE['quality']['fps']},
        'tracks': tracks,
        'features': {'progress_bar': True, 'safe_captions': True, 'pattern_interrupts': True, 'audio_ducking': True},
    }


def save_plan(timeline_path='output/timeline_v5.json', output_path='output/edit_plan_v5.json'):
    timeline = json.loads((ROOT / timeline_path).read_text(encoding='utf-8'))
    if isinstance(timeline, dict):
        timeline = timeline.get('timeline', timeline.get('shots', []))
    plan = build_edit_plan(timeline)
    out = ROOT / output_path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    print(out)


if __name__ == '__main__':
    save_plan()
