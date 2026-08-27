#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parent
work=pathlib.Path(tempfile.mkdtemp(prefix='profitmente-speed-')); assets=work/'assets'; assets.mkdir()
def run(args,**kw): return subprocess.run([str(x) for x in args],check=True,**kw)
source=assets/'speed.mp4'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=s=160x284:r=30:d=2','-f','lavfi','-i','sine=frequency=880:sample_rate=48000:duration=2','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source])
project={'version':'1.8','name':'Speed Regression','mode':'Manual','duration':1,'format':'9:16','assets':[{'id':'v','name':'speed.mp4','type':'video','mime':'video/mp4'}],'clips':[{'id':'c','track':0,'name':'2x video','start':0,'duration':1,'speed':2,'asset':'v'}]}
p=work/'project.json';p.write_text(json.dumps(project),encoding='utf-8');out=work/'out.mp4'
run([sys.executable,ROOT/'validate_project.py',p,assets])
run([sys.executable,ROOT/'render_mp4.py',p,assets,out])
probe=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration','-show_entries','stream=codec_type','-of','json',out],stdout=subprocess.PIPE,text=True).stdout)
d=float(probe['format']['duration']);assert .85<=d<=1.15,d
assert any(s.get('codec_type')=='audio' for s in probe.get('streams',[])),probe
print(json.dumps({'ok':True,'duration':d,'output':str(out)}));print('SPEED TEST: PASS')
