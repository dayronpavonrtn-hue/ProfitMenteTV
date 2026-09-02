#!/usr/bin/env python3
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT=pathlib.Path(__file__).resolve().parent
VALIDATOR=ROOT/'validate_project.py'


def run(project):
    with tempfile.TemporaryDirectory(prefix='profitmente-numeric-qa-') as td:
        path=pathlib.Path(td)/'project.json'
        path.write_text(json.dumps(project,ensure_ascii=False),encoding='utf-8')
        proc=subprocess.run([sys.executable,str(VALIDATOR),str(path)],capture_output=True,text=True)
        assert 'Traceback' not in proc.stderr,proc.stderr
        payload=json.loads(proc.stdout)
        return proc,payload


def base_project():
    return {'format':'9:16','duration':5,'clips':[{'id':'m1','track':2,'start':0,'duration':1,'name':'Título'}],'assets':[]}


proc,payload=run(base_project())
assert proc.returncode==0,(proc.stdout,proc.stderr)
assert payload['ok'] is True

cases=[
    ('project duration text',lambda p:p.update(duration='oops'),'duración del proyecto no es numérico'),
    ('project duration infinity',lambda p:p.update(duration='Infinity'),'duración del proyecto debe ser un número finito'),
    ('clip start nan',lambda p:p['clips'][0].update(start='NaN'),'inicio debe ser un número finito'),
    ('clip duration infinity',lambda p:p['clips'][0].update(duration='Infinity'),'duración debe ser un número finito'),
    ('clip speed text',lambda p:p['clips'][0].update(speed='rápido'),'velocidad no es numérico'),
    ('fractional track',lambda p:p['clips'][0].update(track=2.5),'track debe ser un entero'),
]
for label,mutate,expected in cases:
    project=base_project();mutate(project)
    proc,payload=run(project)
    assert proc.returncode==2,f'{label}: expected validation failure, got {proc.returncode}'
    assert payload['ok'] is False,label
    assert any(expected.lower() in error.lower() for error in payload['errors']),(label,payload['errors'])

# Numeric strings from portable/legacy JSON remain accepted when finite and integral.
project=base_project();project['duration']='5';project['clips'][0].update(track='2',start='0.5',duration='1.5',speed='1')
proc,payload=run(project)
assert proc.returncode==0,(proc.stdout,proc.stderr)
assert payload['ok'] is True

print('Render numeric validation QA OK')
