import json
from pathlib import Path
from timeline_v5 import build_timeline
from auto_editor_v5 import build_edit_plan

root=Path(__file__).parent
video=json.loads((root/'video.json').read_text(encoding='utf-8'))
style=json.loads((root/'v5_style.json').read_text(encoding='utf-8'))
script=video['script']
timeline=build_timeline(script, style)
edit=build_edit_plan(timeline, style)
out=root/'output'
out.mkdir(exist_ok=True)
(out/'timeline_v5.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'edit_plan_v5.json').write_text(json.dumps(edit,ensure_ascii=False,indent=2),encoding='utf-8')
print('v5 edit plan ready:', len(timeline), 'segments')
