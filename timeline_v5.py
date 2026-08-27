import json,re
from pathlib import Path

ROOT=Path(__file__).parent
cfg=json.loads((ROOT/'video.json').read_text(encoding='utf-8'))
style=json.loads((ROOT/'v5_style.json').read_text(encoding='utf-8'))


def sentences(text):
    parts=[x.strip() for x in re.split(r'(?<=[.!?])\s+',text.strip()) if x.strip()]
    return parts or [text.strip()]


def build():
    parts=sentences(cfg['script'])
    blocks=[]
    for i,text in enumerate(parts):
        if i==0:
            role='hook'
        elif i==len(parts)-1:
            role='cta'
        else:
            role='value'
        words=text.split()
        blocks.append({
            'id':i+1,
            'role':role,
            'text':text,
            'word_count':len(words),
            'force_visual_change':True,
            'caption_words':style['editing']['caption_words'],
            'target_cut_seconds':style['editing']['hook_cut_seconds'] if role=='hook' else style['editing']['target_cut_seconds'],
            'pattern_interrupt': role=='hook' or i%3==0
        })
    result={'version':'v5','blocks':blocks}
    (ROOT/'timeline_v5.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"timeline v5: {len(blocks)} narrative blocks")

if __name__=='__main__':
    build()
