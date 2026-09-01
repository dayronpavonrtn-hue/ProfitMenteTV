#!/usr/bin/env python3
import json
import pathlib
import tempfile
import threading
import time
import urllib.error
import urllib.request
from studio_server import (
    Handler,
    ThreadingHTTPServer,
    RENDER_JOBS,
    RENDER_LOCK,
    RENDER_RESULT_TTL_SECONDS,
    _finish_job_download,
    _job_snapshot,
    _prune_render_jobs,
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

# A failed/truncated HTTP delivery must leave the completed MP4 available for the
# browser client's existing result retry. Cleanup happens only after delivery.
with tempfile.TemporaryDirectory(prefix='profitmente-result-retry-test-') as parent:
    td=pathlib.Path(parent)/'job-files';td.mkdir()
    output=td/'output.mp4';output.write_bytes(b'0123456789')
    job={'id':'retry-safe','status':'done','progress':100,'created':time.time(),'finished_at':time.time(),'cancel_requested':False,'qc':{'ok':True},'error':None,'tempdir':str(td),'output':str(output),'result_downloads':0,'download_consumed':False}
    with RENDER_LOCK:
        previous=dict(RENDER_JOBS);RENDER_JOBS.clear();RENDER_JOBS[job['id']]=job
    try:
        assert _finish_job_download(job['id'],delivered=False) is False
        assert job['id'] in RENDER_JOBS,'interrupted delivery must keep completed job for retry'
        assert output.is_file(),'interrupted delivery must keep rendered MP4 for retry'
        assert _finish_job_download(job['id'],delivered=True) is True
        assert job['id'] not in RENDER_JOBS,'successful delivery should consume completed job'
        assert not td.exists(),'successful delivery should clean temporary render files'
    finally:
        with RENDER_LOCK:
            RENDER_JOBS.clear();RENDER_JOBS.update(previous)

# Retry safety must not become an unbounded disk leak. Old terminal jobs are
# reclaimed, while an old result actively being transmitted is protected.
with tempfile.TemporaryDirectory(prefix='profitmente-result-ttl-test-') as parent:
    root=pathlib.Path(parent)
    stale_dir=root/'stale';stale_dir.mkdir();stale_output=stale_dir/'output.mp4';stale_output.write_bytes(b'stale')
    active_dir=root/'active';active_dir.mkdir();active_output=active_dir/'output.mp4';active_output.write_bytes(b'active')
    now=time.time()
    stale={'id':'stale','status':'done','created':now-RENDER_RESULT_TTL_SECONDS-20,'finished_at':now-RENDER_RESULT_TTL_SECONDS-10,'tempdir':str(stale_dir),'output':str(stale_output),'result_downloads':0}
    active={'id':'active','status':'done','created':now-RENDER_RESULT_TTL_SECONDS-20,'finished_at':now-RENDER_RESULT_TTL_SECONDS-10,'tempdir':str(active_dir),'output':str(active_output),'result_downloads':1}
    recent={'id':'recent','status':'error','created':now,'finished_at':now,'tempdir':None,'result_downloads':0}
    with RENDER_LOCK:
        previous=dict(RENDER_JOBS);RENDER_JOBS.clear();RENDER_JOBS.update(stale=stale,active=active,recent=recent)
    try:
        assert _prune_render_jobs(now=now)==1
        assert 'stale' not in RENDER_JOBS and not stale_dir.exists(),'stale completed render should release disk space'
        assert 'active' in RENDER_JOBS and active_output.is_file(),'active result download must never be pruned'
        assert 'recent' in RENDER_JOBS,'recent terminal metadata should remain available'
        active['result_downloads']=0
        assert _prune_render_jobs(now=now)==1
        assert 'active' not in RENDER_JOBS and not active_dir.exists()
    finally:
        with RENDER_LOCK:
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
    assert data.get('render_result_retry_safe') is True
    assert data.get('render_result_ttl_seconds') == RENDER_RESULT_TTL_SECONDS

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
