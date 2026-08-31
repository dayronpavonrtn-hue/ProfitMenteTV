#!/usr/bin/env python3
import pathlib,tempfile
import media_preflight as mp


def run():
    project={
        'trackState':{},
        'assets':[
            {'id':'v','name':'video.mp4','type':'video'},
            {'id':'a','name':'voice.wav','type':'audio'},
        ],
        'clips':[
            {'track':0,'asset':'v'},
            {'track':6,'asset':'a'},
        ],
    }
    with tempfile.TemporaryDirectory() as td:
        td=pathlib.Path(td)
        (td/'video.mp4').write_bytes(b'x')
        (td/'voice.wav').write_bytes(b'x')
        original=mp.probe_media
        try:
            mp.probe_media=lambda path,timeout=12: ({'video'},1.0) if path.name=='video.mp4' else ({'audio'},2.0)
            report=mp.inspect(project,td)
            assert report['ok'] and report['checkedAssets']==2,report

            mp.probe_media=lambda path,timeout=12: ({'video'},1.0)
            report=mp.inspect(project,td)
            assert not report['ok'] and any('stream de audio' in e for e in report['errors']),report

            project['trackState']={'6':{'muted':True}}
            report=mp.inspect(project,td)
            assert report['ok'] and report['checkedAssets']==1,report

            project['trackState']={}
            project['clips'][1]['muted']=True
            report=mp.inspect(project,td)
            assert report['ok'] and report['checkedAssets']==1,report
        finally:
            mp.probe_media=original
    print('media preflight regression OK')


if __name__=='__main__': run()
