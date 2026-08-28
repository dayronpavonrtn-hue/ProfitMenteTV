#!/usr/bin/env python3
import json, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path(__file__).resolve().parent
validator=ROOT/'validate_project.py'
with tempfile.TemporaryDirectory() as td:
    d=pathlib.Path(td); assets=d/'assets'; assets.mkdir(); project=d/'project.json'
    hidden={
      'version':'1.7','name':'disabled-missing','format':'9:16','duration':5,
      'trackState':{'0':{'hidden':True},'2':{'hidden':True},'3':{'hidden':True},'6':{'muted':True}},
      'assets':[],
      'clips':[
        {'id':'v','track':0,'asset':'missing-video','name':'hidden visual','start':0,'duration':5,'fitMode':'bad','speed':99},
        {'id':'m','track':2,'name':'','start':0,'duration':2,'textStyle':'bad'},
        {'id':'c','track':3,'name':'hidden caption','start':0,'duration':2},
        {'id':'a','track':6,'asset':'missing-audio','name':'muted voice','start':0,'duration':5,'fadeIn':99}
      ]
    }
    project.write_text(json.dumps(hidden),encoding='utf-8')
    ok=subprocess.run([sys.executable,str(validator),str(project),str(assets)],capture_output=True,text=True)
    assert ok.returncode==0, ok.stdout+ok.stderr
    enabled=dict(hidden)
    enabled['trackState']={}
    project.write_text(json.dumps(enabled),encoding='utf-8')
    bad=subprocess.run([sys.executable,str(validator),str(project),str(assets)],capture_output=True,text=True)
    assert bad.returncode!=0, bad.stdout+bad.stderr
    assert 'asset no declarado' in bad.stdout or 'velocidad inválida' in bad.stdout
print('Disabled-track validator QA OK')
