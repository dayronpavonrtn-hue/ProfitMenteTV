#!/usr/bin/env python3
from output_qc import analyze_probe, project_expects_audio


def probe(width=1080, height=1920, duration='45.02', vcodec='h264', acodec='aac', fps='30/1', size='1234567'):
    streams=[{'codec_type':'video','codec_name':vcodec,'width':width,'height':height,'avg_frame_rate':fps,'pix_fmt':'yuv420p'}]
    if acodec:
        streams.append({'codec_type':'audio','codec_name':acodec})
    return {'streams':streams,'format':{'duration':duration,'size':size}}


project={'format':'9:16','duration':45,'clips':[{'track':0,'duration':45},{'track':5,'duration':20}]}
r=analyze_probe(project,probe())
assert r['ok'] and r['score']==100, r
assert r['metrics']['width']==1080 and r['metrics']['height']==1920
assert r['metrics']['video_codec']=='h264' and r['metrics']['audio_codec']=='aac'
assert project_expects_audio(project)

bad=analyze_probe(project,probe(width=1920,height=1080,duration='40',acodec=''))
assert not bad['ok']
text=' '.join(bad['issues'])
assert 'Resolución' in text and 'Duración' in text and 'audio' in text

silent={'format':'1:1','duration':12,'clips':[{'track':0,'duration':12}]}
r=analyze_probe(silent,probe(width=1080,height=1080,duration='12',acodec=''))
assert r['ok'], r
assert not project_expects_audio(silent)

muted={'format':'16:9','duration':20,'trackState':{'5':{'muted':True}},'clips':[{'track':5,'duration':20}]}
assert not project_expects_audio(muted)
r=analyze_probe(muted,probe(width=1920,height=1080,duration='20',acodec='opus',fps='120/1'))
assert not r['ok'], r
assert any('Frame rate' in issue for issue in r['issues'])
assert any('Codec de audio' in warning for warning in r['warnings'])

sixty={'format':'16:9','duration':20,'fps':60,'trackState':{'5':{'muted':True}},'clips':[{'track':5,'duration':20}]}
r=analyze_probe(sixty,probe(width=1920,height=1080,duration='20',acodec='aac',fps='60/1'))
assert r['ok'], r

print('output qc engine ok')
