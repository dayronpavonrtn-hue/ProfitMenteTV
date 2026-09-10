#!/usr/bin/env python3
"""End-to-end $0 smoke test for ProfitMente Studio.
Creates synthetic media with FFmpeg, validates projects, renders MP4 and verifies them with ffprobe.
Usage: python studio/smoke_test.py [workdir]
"""
import json, pathlib, subprocess, sys, tempfile, tarfile
ROOT=pathlib.Path(__file__).resolve().parent
work=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path(tempfile.mkdtemp(prefix='profitmente-smoke-'))
assets=work/'assets'; assets.mkdir(parents=True,exist_ok=True)
project_path=work/'project.json'; output=work/'profitmente-smoke.mp4'
def run(cmd):
    print('+',' '.join(map(str,cmd)),flush=True); subprocess.run([str(x) for x in cmd],check=True)
def probe_file(path):
    probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height','-show_entries','format=duration,size','-of','json',str(path)],check=True,capture_output=True,text=True)
    return json.loads(probe.stdout)
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=#151a23:s=360x640:r=30:d=3','-c:v','libx264','-pix_fmt','yuv420p',assets/'scene1.mp4'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=#242c39:s=360x640:r=30:d=3','-c:v','libx264','-pix_fmt','yuv420p',assets/'scene2.mp4'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=180:sample_rate=48000:duration=6','-c:a','pcm_s16le',assets/'music.wav'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=5','-c:a','pcm_s16le',assets/'voice.wav'])
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=880:sample_rate=48000:duration=0.4','-c:a','pcm_s16le',assets/'sfx.wav'])
project={'version':'1.6','name':'ProfitMente Smoke Test','mode':'Automático','duration':6,'format':'9:16','assets':[{'id':'v1','name':'scene1.mp4','type':'video','mime':'video/mp4'},{'id':'v2','name':'scene2.mp4','type':'video','mime':'video/mp4'},{'id':'m1','name':'music.wav','type':'audio','mime':'audio/wav'},{'id':'vo1','name':'voice.wav','type':'audio','mime':'audio/wav'},{'id':'s1','name':'sfx.wav','type':'audio','mime':'audio/wav'}],'clips':[{'id':'c1','track':0,'name':'Hook','start':0,'duration':3,'asset':'v1','transition':'cut','motion':'slow-zoom'},{'id':'c2','track':0,'name':'Value','start':3,'duration':3,'asset':'v2','transition':'slide','motion':'push-in'},{'id':'cap1','track':3,'name':'INVIERTE CON DATOS','start':.35,'duration':2.25,'asset':None,'style':'hook-pop','animation':'pop','wordTimings':[{'word':'INVIERTE','start':.35,'end':1.0,'duration':.65},{'word':'CON','start':1.0,'end':1.45,'duration':.45},{'word':'DATOS','start':1.45,'end':2.6,'duration':1.15}]},{'id':'cap2','track':3,'name':'AUTOMATIZA EL ANALISIS','start':3.2,'duration':2.2,'asset':None,'style':'dynamic','animation':'word-pulse','wordTimings':[{'word':'AUTOMATIZA','start':3.2,'end':4.0,'duration':.8},{'word':'EL','start':4.0,'end':4.35,'duration':.35},{'word':'ANALISIS','start':4.35,'end':5.4,'duration':1.05}]},{'id':'music','track':5,'name':'Music','start':0,'duration':6,'asset':'m1','volume':.22},{'id':'voice','track':6,'name':'Voice','start':.5,'duration':5,'asset':'vo1','volume':.85},{'id':'sfx','track':4,'name':'SFX','start':2.8,'duration':.4,'asset':'s1','volume':.6}]}
project_path.write_text(json.dumps(project,ensure_ascii=False,indent=2),encoding='utf-8')
run([sys.executable,ROOT/'validate_project.py',project_path,assets]); run([sys.executable,ROOT/'render_mp4.py',project_path,assets,output])
info=probe_file(output); streams=info['streams']; video=next(s for s in streams if s.get('codec_type')=='video')
assert video['width']==1080 and video['height']==1920,video
assert any(s.get('codec_type')=='audio' for s in streams),streams
assert 5.8<=float(info['format']['duration'])<=6.2,info
assert int(info['format']['size'])>10000,info

# Exercise the actual production export boundary used by Studio: portable bundle,
# canonical media IDs, structural/parity/media preflights, composition, full decode,
# post-render QC and atomic MP4 publication. A legacy numeric alias deliberately
# crosses the bundle boundary so the smoke test also proves browser/render identity
# normalization is wired into the real export path rather than only unit-tested.
bundle_project=json.loads(json.dumps(project))
bundle_project['name']='ProfitMente Production Bundle Smoke Test'
bundle_project['assets'][0]['id']='007'
bundle_project['clips'][0]['asset']=7
bundle_project_path=work/'bundle-project.json'
bundle_project_path.write_text(json.dumps(bundle_project,ensure_ascii=False,indent=2),encoding='utf-8')
bundle=work/'profitmente-smoke.profitmente.tar'; bundle_output=work/'profitmente-bundle-smoke.mp4'
with tarfile.open(bundle,'w:') as tar:
    tar.add(bundle_project_path,arcname='project.json')
    for media in bundle_project['assets']:
        tar.add(assets/media['name'],arcname=f"assets/{media['name']}")
run([sys.executable,ROOT/'render_bundle.py',bundle,bundle_output])
bundle_info=probe_file(bundle_output); bundle_streams=bundle_info['streams']; bundle_video=next(s for s in bundle_streams if s.get('codec_type')=='video')
assert bundle_video['width']==1080 and bundle_video['height']==1920,bundle_video
assert any(s.get('codec_type')=='audio' for s in bundle_streams),bundle_streams
assert 5.8<=float(bundle_info['format']['duration'])<=6.2,bundle_info
assert int(bundle_info['format']['size'])>10000,bundle_info
bundle_qc_path=bundle_output.with_suffix(bundle_output.suffix+'.qc.json')
assert bundle_qc_path.is_file(),bundle_qc_path
bundle_qc=json.loads(bundle_qc_path.read_text(encoding='utf-8'))
assert bundle_qc.get('ok') is True,bundle_qc

# Second render verifies that a normal video clip keeps its own embedded audio even
# when the user has not duplicated that sound onto Music/Voice/SFX tracks.
source_video=assets/'source-audio.mp4'; source_project_path=work/'source-audio-project.json'; source_output=work/'source-audio-render.mp4'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=#102030:s=360x640:r=30:d=2','-f','lavfi','-i','sine=frequency=660:sample_rate=48000:duration=2','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source_video])
source_project={'version':'1.6','name':'Source Audio Test','mode':'Manual','duration':2,'format':'9:16','assets':[{'id':'sv','name':'source-audio.mp4','type':'video','mime':'video/mp4'}],'clips':[{'id':'svc','track':0,'name':'Video con audio original','start':0,'duration':2,'asset':'sv','sourceVolume':.75}]}
source_project_path.write_text(json.dumps(source_project,ensure_ascii=False,indent=2),encoding='utf-8')
run([sys.executable,ROOT/'validate_project.py',source_project_path,assets]); run([sys.executable,ROOT/'render_mp4.py',source_project_path,assets,source_output])
source_info=probe_file(source_output); source_streams=source_info['streams']
assert any(s.get('codec_type')=='audio' for s in source_streams),source_streams
assert 1.8<=float(source_info['format']['duration'])<=2.2,source_info
assert int(source_info['format']['size'])>5000,source_info
print(json.dumps({'ok':True,'output':str(output),'bundle_output':str(bundle_output),'bundle_qc':bundle_qc,'source_audio_output':str(source_output),'probe':info},indent=2)); print('PROFITMENTE STUDIO SMOKE TEST: PASS')
