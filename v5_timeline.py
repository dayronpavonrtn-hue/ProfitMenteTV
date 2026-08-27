import json,re
from pathlib import Path
R=Path(__file__).parent
cfg=json.loads((R/'video.json').read_text(encoding='utf-8'))
style=json.loads((R/'v5_style.json').read_text(encoding='utf-8'))
script=cfg['script'].strip()
parts=[p.strip() for p in re.split(r'(?<=[.!?])\s+',script) if p.strip()]
beats=[]
for i,text in enumerate(parts):
    words=text.split()
    kind='hook' if i==0 else ('cta' if i==len(parts)-1 else 'value')
    beats.append({'id':i+1,'kind':kind,'text':text,'words':words,'visual_change':True,'caption_words':style['editing']['caption_words']})
plan={'version':'v5','style':style,'beats':beats,'rules':{'hook_max_seconds':4.0,'no_static_shot_over_seconds':1.5,'caption_sync':'beat','visual_storytelling':True}}
(R/'v5_timeline.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'v5 timeline ready: {len(beats)} beats')
