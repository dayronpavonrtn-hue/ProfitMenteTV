#!/usr/bin/env python3
"""End-to-end $0 smoke test for ProfitMente Studio.
Creates synthetic media with FFmpeg, validates a project, renders MP4 and verifies it with ffprobe.
Usage: python studio/smoke_test.py [workdir]
"""
import json, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path(__file__).resolve().parent
work=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path(tempfile.mkdtemp(prefix='profitmente-smoke-'))
assets=work/'assets'; assets.mkdir(parents=True,exist_ok=True)
project_path=work/'project.json'; output=work/'profitmente-smoke.mp4'
def run(cmd):
    print('+',' '.join(map(str,cmd)),flush=True); subprocess.run([str(x) for x in cmd],check=True)
# Small synthetic sources keep CI fast. The renderer itself scales them to the final 1080x1920 output.
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=#151a23:s=360x640:r=30:d=3','-c:v','libx264','-pix_fmt','yuv420p',assets/'scene1.mp4'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=#242c39:s=360x640:r=30:d=3','-c:v','libx264','-pix_fmt','yuv420p',assets/'scene2.mp4'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=180:sample_rate=48000:duration=6','-c:a','pcm_s16le',assets/'music.wav'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=5','-c:a','pcm_s16le',assets/'voice.wav'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=880:sample_rate=48000:duration=0.4','-c:a','pcm_s16le',assets/'sfx.wav'])
project={'version':'1.3','name':'ProfitMente Smoke Test','mode':'Automático','duration':6,'format':'9:16','assets':[{'id':'v1','name':'scene1.mp4','type':'video','mime':'video/mp4'},{'id':'v2','name':'scene2.mp4','type':'video','mime':'video/mp4'},{'id':'m1','name':'music.wav','type':'audio','mime':'audio/wav'},{'id':'vo1','name':'voice.wav','type':'audio','mime':'audio/wav'},{'id':'s1','name':'sfx.wav','type':'audio','mime':'audio/wav'}],'clips':[{'id':'c1','track':0,'name':'Hook','start':0,'duration':3,'asset':'v1'},{'id':'c2','track':0,'name':'Value','start':3,'duration':3,'asset':'v2'},{'id':'cap1','track':3,'name':'INVIERTE CON DATOS','start':.35,'duration':2.25,'asset':None},{'id':'cap2','track':3,'name':'AUTOMATIZA EL ANALISIS','start':3.2,'duration':2.2,'asset':None},{'id':'music','track':5,'name':'Music','start':0,'duration':6,'asset':'m1','volume':.22},{'id':'voice','track':6,'name':'Voice','start':.5,'duration':5,'asset':'vo1','volume':.85},{'id':'sfx','track':4,'name':'SFX','start':2.8,'duration':.4,'asset':'s1','volume':.6}]}
project_path.write_text(json.dumps(project,ensure_ascii=False,indent=2),encoding='utf-8')
run([sys.executable,ROOT/'validate_project.py',project_path,assets]); run([sys.executable,ROOT/'render_mp4.py',project_path,assets,output])
probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height','-show_entries','format=duration,size','-of','json',str(output)],check=True,capture_output=True,text=True)
info=json.loads(probe.stdout); streams=info['streams']; video=next(s for s in streams if s.get('codec_type')=='video')
assert video['width']==1080 and video['height']==1920,video
assert any(s.get('codec_type')=='audio' for s in streams),streams
assert 5.8<=float(info['format']['duration'])<=6.2,info
assert int(info['format']['size'])>10000,info
print(json.dumps({'ok':True,'output':str(output),'probe':info},indent=2)); print('PROFITMENTE STUDIO SMOKE TEST: PASS')
