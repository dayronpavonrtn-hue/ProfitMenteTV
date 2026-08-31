#!/usr/bin/env python3
"""Regression: Motion Pop in MP4 must grow around its center like Studio Preview."""
import json,pathlib,subprocess,sys,tempfile

ROOT=pathlib.Path(__file__).resolve().parent
W,H=1080,1920

def frame(path,t):
    raw=subprocess.run([
        'ffmpeg','-v','error','-ss',f'{t:.3f}','-i',str(path),'-frames:v','1',
        '-f','rawvideo','-pix_fmt','rgb24','pipe:1'
    ],check=True,capture_output=True).stdout
    if len(raw)!=W*H*3:raise AssertionError(f'Frame incompleto en {t}: {len(raw)} bytes')
    return raw

def white_bounds(raw):
    xs=[];ys=[]
    for pos in range(0,len(raw)-2,3):
        r,g,b=raw[pos],raw[pos+1],raw[pos+2]
        # White title remains close to neutral even while its entrance alpha is low.
        if min(r,g,b)>24 and max(r,g,b)-min(r,g,b)<18:
            px=pos//3;xs.append(px%W);ys.append(px//W)
    if not xs:raise AssertionError('No se detectó texto blanco Motion en el frame')
    return min(xs),min(ys),max(xs),max(ys)

def width(box):return box[2]-box[0]+1
def center_y(box):return (box[1]+box[3])/2

with tempfile.TemporaryDirectory(prefix='profitmente-motion-pop-') as tmp:
    td=pathlib.Path(tmp);assets=td/'assets';assets.mkdir();project=td/'project.json';out=td/'motion-pop.mp4'
    data={
        'version':'1.8','name':'Motion Pop Parity','format':'9:16','fps':30,'duration':0.8,
        'assets':[],
        'clips':[{
            'id':'motion-pop','track':2,'name':'PROFITMENTE','start':0.10,'duration':0.55,
            'textStyle':'title','textAnimation':'pop','textX':0,'textY':0,'fontSize':72,
            'textColor':'#FFFFFF','boxColor':'#000000','boxOpacity':0
        }]
    }
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'render_motion_text.py'),str(project),str(assets),str(out)],check=True)
    early=white_bounds(frame(out,0.125));settled=white_bounds(frame(out,0.40))
    ew,sw=width(early),width(settled)
    if not ew < sw*0.97:
        raise AssertionError(f'Pop no creció en MP4: early={ew}px settled={sw}px')
    if abs(center_y(early)-center_y(settled))>7:
        raise AssertionError(f'Pop se desplazó verticalmente en lugar de escalar al centro: early={early} settled={settled}')
    if sw<300:raise AssertionError(f'Título asentado inesperadamente pequeño: {sw}px')
    print(json.dumps({'ok':True,'early_width':ew,'settled_width':sw,'growth':round(sw/ew,3),'early_box':early,'settled_box':settled},indent=2))
