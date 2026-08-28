#!/usr/bin/env python3
import json,pathlib,re,subprocess,tempfile,sys
ROOT=pathlib.Path(__file__).resolve().parent

def mean_volume(path,start,dur=.12):
    p=subprocess.run(['ffmpeg','-hide_banner','-ss',str(start),'-t',str(dur),'-i',str(path),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
    m=re.search(r'mean_volume:\s*(-?[0-9.]+) dB',p.stderr)
    if not m: raise RuntimeError('No se pudo medir volumen')
    return float(m.group(1))

with tempfile.TemporaryDirectory() as td:
    d=pathlib.Path(td); assets=d/'assets'; assets.mkdir(); tone=assets/'tone.wav'; out=d/'fade.mp4'; project=d/'project.json'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=4','-c:a','pcm_s16le',str(tone)],check=True)
    data={'name':'audio-fade-test','format':'9:16','duration':4,'assets':[{'id':'a1','name':'tone.wav','type':'audio'}],'clips':[{'id':'c1','asset':'a1','name':'tone','track':6,'start':0,'duration':4,'volume':1,'fadeIn':1.2,'fadeOut':.8}]}
    project.write_text(json.dumps(data),encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'render_mp4.py'),str(project),str(assets),str(out)],check=True,capture_output=True,text=True)
    first=mean_volume(out,.05); middle=mean_volume(out,2); tail=mean_volume(out,3.9,.08)
    assert middle-first>8,(first,middle,tail)
    assert middle-tail>8,(first,middle,tail)
    print('Audio envelope render OK',{'first':first,'middle':middle,'tail':tail})