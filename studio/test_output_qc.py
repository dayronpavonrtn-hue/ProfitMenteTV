#!/usr/bin/env python3
from output_qc import analyze_probe, project_expects_audio


def probe(width=1080, height=1920, duration='45.02', vcodec='h264', acodec='aac', fps='30/1', size='1234567', video_duration=None):
    streams=[{'codec_type':'video','codec_name':vcodec,'width':width,'height':height,'avg_frame_rate':fps,'pix_fmt':'yuv420p','duration':video_duration if video_duration is not None else duration}]
    if acodec:
        streams.append({'codec_type':'audio','codec_name':acodec})
    return {'streams':streams,'format':{'duration':duration,'size':size}}


project={'format':'9:16','duration':45,'clips':[{'track':0,'duration':45},{'track':5,'duration':20}]}
r=analyze_probe(project,probe())
assert r['ok'] and r['score']==100, r
assert r['metrics']['width']==1080 and r['metrics']['height']==1920
assert r['metrics']['video_codec']=='h264' and r['metrics']['audio_codec']=='aac'
assert r['metrics']['video_duration']==45.02
assert project_expects_audio(project)

bad=analyze_probe(project,probe(width=1920,height=1080,duration='40',acodec=''))
assert not bad['ok']
text=' '.join(bad['issues'])
assert 'Resolución' in text and 'Duración' in text and 'audio' in text

# Regression: the container can look complete because another stream continues even though
# the actual video stream ended early. This must fail QC instead of producing a false success.
truncated_video=analyze_probe(project,probe(duration='45.00',video_duration='12.00'))
assert not truncated_video['ok'], truncated_video
assert truncated_video['metrics']['duration']==45.0
assert truncated_video['metrics']['video_duration']==12.0
assert any('pista de video dura 12.00s' in issue for issue in truncated_video['issues']), truncated_video

# ffprobe may omit stream duration in some valid containers; container-level duration remains
# the fallback in that case and QC should not reject an otherwise valid export.
stream_duration_unknown=analyze_probe(project,probe(duration='45.00',video_duration='N/A'))
assert stream_duration_unknown['ok'], stream_duration_unknown
assert stream_duration_unknown['metrics']['video_duration'] is None

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
