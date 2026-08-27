#!/usr/bin/env python3
"""ProfitMente Studio $0 MP4 renderer.
Usage: python studio/render_mp4.py project.json assets_dir output.mp4
Requires FFmpeg/ffprobe available on PATH.
"""
import json,sys,subprocess,pathlib,shlex

if len(sys.argv) != 4:
    raise SystemExit('Usage: render_mp4.py project.json assets_dir output.mp4')

p=pathlib.Path(sys.argv[1]); assets=pathlib.Path(sys.argv[2]); out=pathlib.Path(sys.argv[3])
project=json.loads(p.read_text(encoding='utf-8'))
fmt=project.get('format','9:16'); w,h=(1080,1920) if fmt=='9:16' else ((1920,1080) if fmt=='16:9' else (1080,1080))
duration=max(.25,float(project.get('duration',45))); clips=project.get('clips',[]); amap={a['id']:a for a in project.get('assets',[])}
inputs=[]; filters=[]; input_index={}

def asset_path(asset_id):
    a=amap.get(asset_id)
    if not a: raise ValueError(f'Asset id no encontrado: {asset_id}')
    f=assets/a['name']
    if not f.exists(): raise FileNotFoundError(f'Falta asset: {f}')
    return a,f

def add_input(asset_id):
    if asset_id in input_index:return input_index[asset_id]
    a,f=asset_path(asset_id); idx=len(input_index); input_index[asset_id]=idx
    if a.get('type')=='image': inputs.extend(['-loop','1','-i',str(f)])
    else: inputs.extend(['-i',str(f)])
    return idx

visual=[c for c in clips if c.get('track') in (0,1) and c.get('asset')]
audio=[c for c in clips if c.get('track') in (4,5,6) and c.get('asset')]
for c in visual+audio:add_input(c['asset'])

# Base canvas lasts for the whole project. Each visual clip is placed at its timeline start.
base_input=len(input_index); inputs.extend(['-f','lavfi','-i',f'color=c=0x090b10:s={w}x{h}:r=30:d={duration}'])
filters.append(f'[{base_input}:v]setpts=PTS-STARTPTS[vbase0]'); base='[vbase0]'
for n,c in enumerate(sorted(visual,key=lambda x:(x.get('track',0),float(x.get('start',0))))):
    idx=input_index[c['asset']]; a=amap[c['asset']]; start=max(0,float(c.get('start',0))); d=max(.05,min(float(c.get('duration',1)),duration-start)); end=start+d
    vin=f'[vis{n}]'; nxt=f'[vbase{n+1}]'
    if a.get('type')=='image':
        filters.append(f'[{idx}:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30,trim=duration={d},setpts=PTS-STARTPTS+{start}/TB{vin}')
    else:
        filters.append(f'[{idx}:v]trim=start=0:duration={d},setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30,setpts=PTS+{start}/TB{vin}')
    filters.append(f"{base}{vin}overlay=0:0:eof_action=pass:enable='between(t,{start},{end})'{nxt}"); base=nxt

# Timed captions.
capn=0
for c in [x for x in clips if x.get('track')==3 and x.get('name')]:
    text=str(c['name']).replace('\\','\\\\').replace(':','\\:').replace("'","\\'").replace('%','\\%')
    start=max(0,float(c.get('start',0))); end=min(duration,start+max(.05,float(c.get('duration',1)))); nxt=f'[cap{capn}]'
    filters.append(f"{base}drawtext=text='{text}':fontcolor=white:fontsize=64:borderw=6:bordercolor=black@0.9:box=1:boxcolor=black@0.35:boxborderw=24:x=(w-text_w)/2:y=h*0.72:enable='between(t,{start},{end})'{nxt}")
    base=nxt; capn+=1

# Audio timeline: trim each source, apply per-clip volume/fades, delay to clip start, then mix.
aouts=[]
for n,c in enumerate(audio):
    idx=input_index[c['asset']]; start=max(0,float(c.get('start',0))); d=max(.05,min(float(c.get('duration',1)),duration-start)); track=int(c.get('track',5)); vol=float(c.get('volume',.22 if track==5 else 1.0)); vol=max(0,min(2,vol)); fade=min(.18,d/3); fadeout=max(0,d-min(.25,d/3)); delay=int(round(start*1000)); label=f'[a{n}]'
    filters.append(f'[{idx}:a]atrim=start=0:duration={d},asetpts=PTS-STARTPTS,volume={vol},afade=t=in:st=0:d={fade},afade=t=out:st={fadeout}:d={min(.25,d/3)},adelay={delay}|{delay}{label}')
    aouts.append(label)
if aouts:
    filters.append(''.join(aouts)+f'amix=inputs={len(aouts)}:duration=longest:dropout_transition=0,atrim=duration={duration},alimiter=limit=0.95[aout]')

cmd=['ffmpeg','-hide_banner','-y',*inputs,'-filter_complex',';'.join(filters),'-map',base]
if aouts: cmd+=['-map','[aout]','-c:a','aac','-b:a','192k']
cmd+=['-t',str(duration),'-r','30','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
print('Rendering:', ' '.join(shlex.quote(x) for x in cmd)); subprocess.run(cmd,check=True)
probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate','-show_entries','format=duration,size','-of','json',str(out)],check=True,capture_output=True,text=True)
print(probe.stdout); print(f'OK: {out}')
