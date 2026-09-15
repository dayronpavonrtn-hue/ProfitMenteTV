#!/usr/bin/env python3
"""Regression coverage for sourceOffset/speed media-bound preflight."""
import pathlib,tempfile
import media_preflight as mp


def run():
    with tempfile.TemporaryDirectory() as td:
        root=pathlib.Path(td); (root/'clip.mp4').write_bytes(b'x')
        original=mp.probe_media
        mp.probe_media=lambda path,timeout=12: ({'video','audio'},10.0)
        try:
            asset={'id':'m1','name':'clip.mp4','type':'video'}
            base={'duration':20,'assets':[asset],'trackState':{},'clips':[]}

            def report(clip):
                project=dict(base); project['clips']=[clip]
                return mp.inspect(project,root)

            assert report({'id':'ok','asset':'m1','track':0,'start':0,'duration':4,'sourceOffset':1,'speed':2})['ok']
            bad=report({'id':'past-eof','asset':'m1','track':0,'start':0,'duration':4,'sourceOffset':3,'speed':2})
            assert not bad['ok'] and 'necesita fuente hasta 11.000s' in bad['errors'][0]
            outside=report({'id':'outside','asset':'m1','track':4,'start':0,'duration':1,'sourceOffset':10,'speed':1})
            assert not outside['ok'] and 'fuera de la duración fuente' in outside['errors'][0]

            # Persisted malformed edit scalars must fail closed instead of being silently normalized.
            negative=report({'id':'negative','asset':'m1','track':0,'duration':1,'sourceOffset':-1,'speed':1})
            assert not negative['ok'] and 'sourceOffset negativo' in negative['errors'][0]
            invalid_offset=report({'id':'bad-offset','asset':'m1','track':0,'duration':1,'sourceOffset':'oops','speed':1})
            assert not invalid_offset['ok'] and 'sourceOffset inválido' in invalid_offset['errors'][0]
            invalid_duration=report({'id':'bad-duration','asset':'m1','track':0,'duration':'NaN','sourceOffset':0,'speed':1})
            assert not invalid_duration['ok'] and 'duración inválida' in invalid_duration['errors'][0]
            invalid_speed=report({'id':'bad-speed','asset':'m1','track':0,'duration':1,'sourceOffset':0,'speed':True})
            assert not invalid_speed['ok'] and 'velocidad inválida' in invalid_speed['errors'][0]
            out_of_range_speed=report({'id':'fast','asset':'m1','track':0,'duration':1,'sourceOffset':0,'speed':9})
            assert not out_of_range_speed['ok'] and 'velocidad inválida' in out_of_range_speed['errors'][0]

            hidden=dict(base); hidden['trackState']={'0':{'hidden':True}}; hidden['clips']=[{'id':'hidden','asset':'m1','track':0,'duration':20}]
            assert mp.inspect(hidden,root)['ok']
            muted=dict(base); muted['clips']=[{'id':'muted','asset':'m1','track':4,'duration':20,'muted':True}]
            assert mp.inspect(muted,root)['ok']

            string_muted=dict(base); string_muted['clips']=[{'id':'string-muted','asset':'m1','track':4,'duration':20,'muted':'true'}]
            assert not mp.inspect(string_muted,root)['ok']

            image={'id':'i1','name':'still.png','type':'image'}; (root/'still.png').write_bytes(b'x')
            image_project={'assets':[image],'trackState':{},'clips':[{'id':'still','asset':'i1','track':0,'duration':99,'sourceOffset':50}]}
            mp.probe_media=lambda path,timeout=12: ({'video'},0.0)
            assert mp.inspect(image_project,root)['ok']
        finally:
            mp.probe_media=original
    print('Media source bounds regression OK')


if __name__=='__main__':run()
