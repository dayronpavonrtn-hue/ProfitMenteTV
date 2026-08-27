import json
from pathlib import Path
from auto_editor_v5 import build_edit_plan

root = Path(__file__).parent
video = json.loads((root/'video.json').read_text(encoding='utf-8'))
style = json.loads((root/'v5_style.json').read_text(encoding='utf-8'))
script = video['script']

# Build timed shots directly from the script so the edit plan can drive the renderer.
parts = [p.strip() for p in script.replace('!','.').replace('?','.').split('.') if p.strip()]
if not parts:
    parts = [script.strip()]

words_total = max(1, sum(len(p.split()) for p in parts))
# Approximate speech timing; final renderer may rescale to the generated voice duration.
estimated_duration = max(8.0, words_total / 2.65)
t = 0.0
timeline = []
for i, text in enumerate(parts):
    weight = max(1, len(text.split())) / words_total
    duration = estimated_duration * weight
    kind = 'hook' if i == 0 else ('cta' if i == len(parts)-1 else 'value')
    timeline.append({
        'start': round(t, 3),
        'end': round(t + duration, 3),
        'kind': kind,
        'text': text,
        'keyword': max(text.split(), key=len) if text.split() else '',
        'scene': i,
    })
    t += duration

edit = build_edit_plan(timeline)
out = root/'output'
out.mkdir(exist_ok=True)
(out/'timeline_v5.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'edit_plan_v5.json').write_text(json.dumps(edit,ensure_ascii=False,indent=2),encoding='utf-8')
print('v5 edit plan ready:', len(timeline), 'segments', 'duration', round(t,2))
