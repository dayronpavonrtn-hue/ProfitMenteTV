#!/usr/bin/env python3
import json
import threading
import time
import urllib.error
import urllib.request
from studio_server import (
    Handler,
    ThreadingHTTPServer,
    RENDER_JOBS,
    RENDER_LOCK,
    _job_snapshot,
    _render_counts,
)

# Queue accounting is deterministic and does not require FFmpeg.
with RENDER_LOCK:
    previous=dict(RENDER_JOBS)
    RENDER_JOBS.clear()
    first={'id':'first','status':'rendering','progress':35,'created':time.time()-2,'cancel_requested':False,'qc':None,'error':None}
    second={'id':'second','status':'queued','progress':10,'created':time.time()-1,'cancel_requested':False,'qc':None,'error':None}
    third={'id':'third','status':'queued','progress':10,'created':time.time(),'cancel_requested':False,'qc':None,'error':None}
    RENDER_JOBS.update(first=first,second=second,third=third)
    assert _render_counts()==(1,2)
    assert _job_snapshot(first)['queue_position'] is None
    assert _job_snapshot(second)['queue_position']==1
    assert _job_snapshot(third)['queue_position']==2
    second['cancel_requested']=True;second['status']='cancelled'
    assert _render_counts()==(1,1)
    assert _job_snapshot(third)['queue_position']==1
    RENDER_JOBS.clear();RENDER_JOBS.update(previous)

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
port=server.server_address[1]
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{port}'
try:
    with urllib.request.urlopen(base+'/api/health',timeout=3) as r:
        data=json.loads(r.read())
    assert data['ok'] is True
    assert 'ffmpeg' in data and 'ffprobe' in data and 'render_ready' in data
    assert data['render_ready'] == bool(data['ffmpeg'] and data['ffprobe'])
    assert data.get('render_jobs') is True
    assert data.get('render_concurrency') == 1
    assert isinstance(data.get('render_active'),int)
    assert isinstance(data.get('render_queued'),int)

    req=urllib.request.Request(base+'/api/render',data=b'x',method='POST',headers={
        'Content-Type':'application/x-tar','Origin':'https://evil.example'
    })
    try:
        urllib.request.urlopen(req,timeout=3)
        raise AssertionError('cross-origin render request should be rejected')
    except urllib.error.HTTPError as e:
        assert e.code==403,e.code

    req=urllib.request.Request(base+'/api/render',data=b'x',method='POST',headers={
        'Content-Type':'text/plain','Origin':base
    })
    try:
        urllib.request.urlopen(req,timeout=3)
        raise AssertionError('invalid render request should be rejected')
    except urllib.error.HTTPError as e:
        expected=415 if data['render_ready'] else 503
        assert e.code==expected,(e.code,expected)

    req=urllib.request.Request(base+'/api/render/jobs/not-a-job',method='GET')
    try:
        urllib.request.urlopen(req,timeout=3)
        raise AssertionError('unknown render job should not exist')
    except urllib.error.HTTPError as e:
        assert e.code==404,e.code

    print('Studio local API QA OK',data)
finally:
    server.shutdown();server.server_close();thread.join(timeout=3)
