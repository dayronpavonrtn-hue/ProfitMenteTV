#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tarfile,tempfile
from track_state_render import normalize_track_solo

ROOT=pathlib.Path(__file__).resolve().parent

# Pure state regression: semantic Solo must work even without browser-generated
# hidden/muted flags, while manual base state survives stale Solo bookkeeping.
p={'trackState':{'0':{'solo':True},'1':{},'5':{'solo':False},'6':{'solo':True}}}
n=normalize_track_solo(p)
assert n['trackState']['0']['hidden'] is False
assert n['trackState']['1']['hidden'] is True
assert n['trackState']['5']['muted'] is True
assert n['trackState']['6']['muted'] is False
assert 'hidden' not in p['trackState']['1'], 'normalizer must not mutate saved project'

stale={'trackState':{'0':{'solo':False,'hidden':True,'_soloVisualActive':True,'_soloHiddenBase':False},'1':{'hidden':True,'_soloVisualActive':True,'_soloHiddenBase':True},'5':{'muted':True,'_soloAudioActive':True,'_soloMutedBase':False}}}
s=normalize_track_solo(stale)
assert s['trackState']['0']['hidden'] is False
assert s['trackState']['1']['hidden'] is True
assert s['trackState']['5']['muted'] is False
assert '_soloVisualActive' not in s['trackState']['0']
assert '_soloAudioActive' not in s['trackState']['5']

with tempfile.TemporaryDirectory() as td:
    d=pathlib.Path(td); pack=d/'pack'; assets=pack/'assets'; assets.mkdir(parents=True)
    red=assets/'solo-red.png'; voice=assets/'solo-voice.wav'; bundle=d/'solo.profitmente.tar'; out=d/'solo.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=red:s=1080x1920:d=1','-frames:v','1',str(red)],check=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=880:duration=1','-c:a','pcm_s16le',str(voice)],check=True)
    project={
      'version':'1.7','name':'solo-render','format':'9:16','duration':1.0,
      # Deliberately only semantic Solo flags: no browser-materialized hidden/muted.
      'trackState':{'0':{'solo':True},'1':{},'5':{},'6':{'solo':True}},
      'assets':[
        {'id':'red','name':'solo-red.png','type':'image'},
        {'id':'offline-overlay','name':'offline-overlay.png','type':'image'},
        {'id':'offline-music','name':'offline-music.wav','type':'audio'},
        {'id':'voice','name':'solo-voice.wav','type':'audio'}
      ],
      'clips':[
        {'id':'v0','track':0,'asset':'red','name':'Solo red','start':0,'duration':1},
        {'id':'v1','track':1,'asset':'offline-overlay','name':'Must stay offline','start':0,'duration':1},
        {'id':'m','track':5,'asset':'offline-music','name':'Must stay offline','start':0,'duration':1},
        {'id':'a','track':6,'asset':'voice','name':'Solo voice','start':0,'duration':1,'fadeIn':0,'fadeOut':0}
      ]
    }
    (pack/'project.json').write_text(json.dumps(project),encoding='utf-8')
    with tarfile.open(bundle,'w') as tar:
        tar.add(pack/'project.json',arcname='project.json')
        tar.add(red,arcname='assets/solo-red.png')
        tar.add(voice,arcname='assets/solo-voice.wav')
    subprocess.run([sys.executable,str(ROOT/'render_bundle.py'),str(bundle),str(out)],check=True)
    probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(out)],check=True,capture_output=True,text=True).stdout)
    kinds=[s.get('codec_type') for s in probe.get('streams',[])]
    assert kinds.count('video')==1 and kinds.count('audio')==1,kinds
    pixel=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss','0.4','-i',str(out),'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],check=True,capture_output=True).stdout[:3]
    assert len(pixel)==3 and pixel[0]>180 and pixel[1]<80 and pixel[2]<80,list(pixel)
    report=json.loads(out.with_suffix('.mp4.qc.json').read_text(encoding='utf-8'))
    assert report.get('ok') is True,report
    print('Track Solo final render OK:',kinds,list(pixel),'QA',report.get('score'))
