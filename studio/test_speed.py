#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parent
work=pathlib.Path(tempfile.mkdtemp(prefix='profitmente-speed-')); assets=work/'assets'; assets.mkdir()
def run(args,**kw): return subprocess.run([str(x) for x in args],check=True,**kw)
source=assets/'speed.mp4'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=s=160x284:r=30:d=5','-f','lavfi','-i','sine=frequency=880:sample_rate=48000:duration=5','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source])

def check_speed(speed):
    project={'version':'1.8','name':f'Speed {speed}x Regression','mode':'Manual','duration':1,'format':'9:16','assets':[{'id':'v','name':'speed.mp4','type':'video','mime':'video/mp4'}],'clips':[{'id':'c','track':0,'name':f'{speed}x video','start':0,'duration':1,'speed':speed,'asset':'v','fadeIn':0,'fadeOut':0}]}
    p=work/f'project-{speed}.json';p.write_text(json.dumps(project),encoding='utf-8');out=work/f'out-{speed}.mp4'
    run([sys.executable,ROOT/'validate_project.py',p,assets])
    run([sys.executable,ROOT/'render_mp4.py',p,assets,out])
    probe=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration','-show_entries','stream=codec_type','-of','json',out],stdout=subprocess.PIPE,text=True).stdout)
    d=float(probe['format']['duration']);assert .85<=d<=1.15,(speed,d)
    assert any(s.get('codec_type')=='audio' for s in probe.get('streams',[])),(speed,probe)
    return {'speed':speed,'duration':d,'output':str(out)}

results=[check_speed(speed) for speed in (.25,.4,1.0,2.5,4.0)]
print(json.dumps({'ok':True,'cases':results}));print('SPEED TEST: PASS')
