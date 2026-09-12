#!/usr/bin/env python3
from track_state_render import normalize_track_solo


def clip(**values):
    base={'id':'clip-1','track':0}
    base.update(values)
    return base


def normalized(**values):
    project={'clips':[clip(**values)],'assets':[]}
    return normalize_track_solo(project)['clips'][0]


def test_numeric_strings_remain_legacy_compatible():
    c=normalized(start='1.25',duration='2.5',sourceOffset='3.75',speed='1.5',transitionDuration='0.4')
    assert c['start']==1.25
    assert c['duration']==2.5
    assert c['sourceOffset']==3.75
    assert c['speed']==1.5
    assert c['transitionDuration']==0.4


def test_invalid_scalars_use_safe_render_defaults():
    c=normalized(start=True,duration={'bad':1},sourceOffset=[],speed=False,transitionDuration='nan')
    assert c['start']==0.0
    assert c['duration']==1.0
    assert c['sourceOffset']==0.0
    assert c['speed']==1.0
    assert 'transitionDuration' not in c


def test_non_finite_values_cannot_reach_ffmpeg():
    c=normalized(start='inf',duration='-inf',sourceOffset=float('nan'),speed='Infinity')
    assert c['start']==0.0
    assert c['duration']==1.0
    assert c['sourceOffset']==0.0
    assert c['speed']==1.0


def test_core_ranges_are_clamped_before_render():
    c=normalized(start='-4',duration='0',sourceOffset='-2',speed='9',transitionDuration='9')
    assert c['start']==0.0
    assert c['duration']==0.05
    assert c['sourceOffset']==0.0
    assert c['speed']==4.0
    assert c['transitionDuration']==2.0


def test_visual_numeric_strings_remain_legacy_compatible():
    c=normalized(brightness='25',contrast='-10',saturation='125',hue='45',scale='1.4',rotation='12',opacity='.7',positionX='15',positionY='-20')
    assert c['brightness']==25.0
    assert c['contrast']==-10.0
    assert c['saturation']==125.0
    assert c['hue']==45.0
    assert c['scale']==1.4
    assert c['rotation']==12.0
    assert c['opacity']==0.7
    assert c['positionX']==15.0
    assert c['positionY']==-20.0


def test_visual_booleans_collections_and_non_finite_values_use_safe_defaults():
    c=normalized(brightness=True,contrast=['20'],saturation={'bad':1},hue='Infinity',scale=False,rotation=[],opacity='nan',positionX={},positionY=True)
    assert c['brightness']==0.0
    assert c['contrast']==0.0
    assert c['saturation']==0.0
    assert c['hue']==0.0
    assert c['scale']==1.0
    assert c['rotation']==0.0
    assert c['opacity']==1.0
    assert c['positionX']==0.0
    assert c['positionY']==0.0


def test_visual_ranges_are_clamped_before_ffmpeg():
    c=normalized(brightness='999',contrast='-999',saturation='999',hue='999',scale='0',rotation='999',opacity='4',positionX='500',positionY='-500')
    assert c['brightness']==100.0
    assert c['contrast']==-90.0
    assert c['saturation']==200.0
    assert c['hue']==180.0
    assert c['scale']==0.25
    assert c['rotation']==180.0
    assert c['opacity']==1.0
    assert c['positionX']==100.0
    assert c['positionY']==-100.0


def test_keyframe_visual_scalars_are_canonicalized_without_mutating_source():
    original={'start':{'scale':'1.25','rotation':True,'opacity':['.5'],'positionX':'20','positionY':'Infinity'},'end':{'scale':'2','rotation':'-45','opacity':'0.25','positionX':{},'positionY':'-35'}}
    c=normalized(keyframes=original)
    assert original['start']['scale']=='1.25'
    assert original['start']['rotation'] is True
    assert c['keyframes']['start']=={'scale':1.25,'rotation':0.0,'opacity':1.0,'positionX':20.0,'positionY':0.0}
    assert c['keyframes']['end']=={'scale':2.0,'rotation':-45.0,'opacity':0.25,'positionX':0.0,'positionY':-35.0}


def test_project_numeric_strings_remain_legacy_compatible():
    result=normalize_track_solo({'duration':'12.5','fps':'29.6','clips':[],'assets':[]})
    assert result['duration']==12.5
    assert result['fps']==30


def test_project_invalid_scalars_use_safe_defaults():
    result=normalize_track_solo({'duration':{'bad':1},'fps':['60'],'clips':[],'assets':[]})
    assert result['duration']==45.0
    assert result['fps']==30


def test_project_non_finite_values_cannot_reach_renderer():
    result=normalize_track_solo({'duration':'Infinity','fps':'nan','clips':[],'assets':[]})
    assert result['duration']==45.0
    assert result['fps']==30


def test_project_ranges_are_canonicalized_before_render():
    result=normalize_track_solo({'duration':'-4','fps':'59.6','clips':[],'assets':[]})
    assert result['duration']==0.25
    assert result['fps']==60


def test_input_project_is_not_mutated():
    original={'duration':'12','fps':'24','clips':[clip(start='2',speed='2')],'assets':[]}
    result=normalize_track_solo(original)
    assert original['duration']=='12'
    assert original['fps']=='24'
    assert original['clips'][0]['start']=='2'
    assert original['clips'][0]['speed']=='2'
    assert result['duration']==12.0
    assert result['fps']==24
    assert result['clips'][0]['start']==2.0
    assert result['clips'][0]['speed']==2.0


if __name__=='__main__':
    tests=[value for name,value in sorted(globals().items()) if name.startswith('test_') and callable(value)]
    for test in tests:
        test()
    print(f'OK: {len(tests)} render scalar normalization checks')
