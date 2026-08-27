#!/usr/bin/env python3
"""ProfitMente Studio $0 MP4 renderer. Usage: python studio/render_mp4.py project.json assets_dir output.mp4"""
import json,sys,subprocess,pathlib,shlex
p=pathlib.Path(sys.argv[1]); assets=pathlib.Path(sys.argv[2]); out=pathlib.Path(sys.argv[3]); project=json.loads(p.read_text(encoding='utf-8'))
w,h=(1080,1920) if project.get('format','9:16')=='9:16' else ((1920,1080) if project.get('format')=='16:9' else (1080,1080)); duration=float(project.get('duration',45)); clips=project.get('clips',[]); amap={a['id']:a for a in project.get('assets',[])}
video=sorted([c for c in clips if c.get('track')==0 and c.get('asset')],key=lambda x:x['start']); inputs=[]; filters=[]
for i,c in enumerate(video):
 a=amap.get(c['asset']); f=assets/(a['name'] if a else ''); inputs+=['-i',str(f)]; d=float(c['duration']); filters.append(f'[{i}:v]trim=0:{d},setpts=PTS-STARTPTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30[v{i}]')
if video:
 filters.append(''.join(f'[v{i}]' for i in range(len(video)))+f'concat=n={len(video)}:v=1:a=0[vbase]'); vout='[vbase]'
else:
 inputs=['-f','lavfi','-i',f'color=c=0x090b10:s={w}x{h}:r=30:d={duration}']; vout='[0:v]'
# Captions become timed drawtext overlays. Requires standard FFmpeg drawtext support.
base=vout; capn=0
for c in [x for x in clips if x.get('track')==3 and x.get('name')]:
 text=str(c['name']).replace('\\','\\\\').replace(':','\\:').replace("'","\\'"); start=float(c['start']); end=start+float(c['duration']); nxt=f'[cap{capn}]'; filters.append(f"{base}drawtext=text='{text}':fontcolor=white:fontsize=64:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h*0.72:enable='between(t,{start},{end})'{nxt}");base=nxt;capn+=1
cmd=['ffmpeg','-y',*inputs]
if filters: cmd+=['-filter_complex',';'.join(filters),'-map',base]
else: cmd+=['-map','0:v']
cmd+=['-t',str(duration),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
print('Rendering:', ' '.join(shlex.quote(x) for x in cmd)); subprocess.run(cmd,check=True); print(out)
