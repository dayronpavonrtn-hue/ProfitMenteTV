#!/usr/bin/env python3
from caption_compact import compact_caption_clip,compact_project_captions

base={'id':'cap1','track':3,'start':2,'duration':4,'name':'Esta es una frase bastante larga que debe dividirse para mantenerse legible en el render final','style':'dynamic'}
parts=compact_caption_clip(base,max_chars=28)
assert len(parts)>=3,parts
assert parts[0]['start']==2
assert abs(sum(x['duration'] for x in parts)-4)<1e-5
assert abs(parts[-1]['start']+parts[-1]['duration']-6)<1e-5
assert all(len(x['name'])<=28 or len(x['name'].split())==1 for x in parts)
assert all(x['renderCaptionSegment'] is True for x in parts)
assert base['name'].startswith('Esta es una frase'), 'source clip must stay unchanged'

word_timed={**base,'wordTimings':[{'word':'Hola','start':2,'end':2.3}]}
assert len(compact_caption_clip(word_timed))==1
assert compact_caption_clip(word_timed)[0]['name']==base['name']

short={**base,'name':'Caption corto'}
assert len(compact_caption_clip(short))==1

very_short={**base,'duration':.2}
assert len(compact_caption_clip(very_short,max_chars=12))==1,'do not create unreadable flashes'

project={'clips':[base,{'id':'v1','track':0,'start':0,'duration':3,'name':'video'}]}
render_project=compact_project_captions(project,max_chars=28)
assert len(render_project['clips'])>len(project['clips'])
assert len(project['clips'])==2,'render compaction must not mutate saved project'
assert render_project['clips'][-1]['id']=='v1'
print('Caption compaction regression passed')
