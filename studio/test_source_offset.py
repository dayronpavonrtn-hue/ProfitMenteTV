#!/usr/bin/env python3
import json,pathlib,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parent
work=pathlib.Path(tempfile.mkdtemp(prefix='profitmente-source-offset-')); assets=work/'assets'; assets.mkdir()
def run(args,**kw): return subprocess.run([str(x) for x in args],check=True,**kw)
parts=[]
for name,color in [('red','red'),('green','lime'),('blue','blue')]:
    p=assets/f'{name}.mp4';parts.append(p);run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'color=c={color}:s=160x284:r=30:d=1','-c:v','libx264','-pix_fmt','yuv420p',p])
concat=work/'list.txt';concat.write_text(''.join(f"file '{p.as_posix()}'\n" for p in parts),encoding='utf-8')
source=assets/'source.mp4';run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',concat,'-c','copy',source])
project={'version':'1.7','name':'Source Offset Regression','mode':'Manual','duration':1,'format':'9:16','assets':[{'id':'v','name':'source.mp4','type':'video','mime':'video/mp4'}],'clips':[{'id':'c','track':0,'name':'Middle segment','start':0,'duration':1,'sourceOffset':1,'asset':'v'}]}
p=work/'project.json';p.write_text(json.dumps(project),encoding='utf-8');out=work/'out.mp4'
run([sys.executable,ROOT/'render_mp4.py',p,assets,out])
raw=run(['ffmpeg','-hide_banner','-loglevel','error','-ss','0.25','-i',out,'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE).stdout
assert len(raw)>=3,raw
r,g,b=raw[:3]
assert g>150 and g>r*1.8 and g>b*1.8,(r,g,b)
print(json.dumps({'ok':True,'rgb':[r,g,b],'output':str(out)}));print('SOURCE OFFSET TEST: PASS')
