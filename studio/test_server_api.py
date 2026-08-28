#!/usr/bin/env python3
import json
import threading
import urllib.error
import urllib.request
from studio_server import Handler, ThreadingHTTPServer

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
