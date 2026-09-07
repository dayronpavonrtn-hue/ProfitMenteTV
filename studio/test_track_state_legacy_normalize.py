#!/usr/bin/env python3
from track_state_render import normalize_track_solo

# Legacy-only projects must keep hidden/muted state when converted for render.
legacy={
    'trackStates':{
        '0':{'hidden':True},
        '3':{'hidden':True},
        '5':{'muted':True},
    }
}
out=normalize_track_solo(legacy)
assert out['trackState']['0']['hidden'] is True, out
assert out['trackState']['3']['hidden'] is True, out
assert out['trackState']['5']['muted'] is True, out
assert 'trackStates' not in out, out

# A newer false value must not silently re-enable a track that an older saved
# representation still marks protected. Browser preview follows the same rule.
conflict={
    'trackState':{'0':{'hidden':False},'6':{'muted':False}},
    'trackStates':{'0':{'hidden':True},'6':{'muted':True}},
}
out=normalize_track_solo(conflict)
assert out['trackState']['0']['hidden'] is True, out
assert out['trackState']['6']['muted'] is True, out

# Legacy Solo is semantic render state. It must hide/mute sibling tracks while
# preserving the selected Solo track, even when no current trackState exists.
solo={
    'trackStates':{'1':{'solo':True},'6':{'solo':True}}
}
out=normalize_track_solo(solo)
assert out['trackState']['1']['hidden'] is False, out
assert out['trackState']['0']['hidden'] is True, out
assert out['trackState']['2']['hidden'] is True, out
assert out['trackState']['3']['hidden'] is True, out
assert out['trackState']['6']['muted'] is False, out
assert out['trackState']['4']['muted'] is True, out
assert out['trackState']['5']['muted'] is True, out

# Stale Solo bookkeeping from a legacy browser snapshot must recover the manual
# base state before applying current Solo semantics, then be stripped.
stale={
    'trackStates':{
        '0':{'hidden':True,'_soloVisualActive':True,'_soloHiddenBase':False},
        '1':{'solo':True},
    }
}
out=normalize_track_solo(stale)
assert out['trackState']['0']['hidden'] is True, out  # hidden by track 1 Solo
assert '_soloVisualActive' not in out['trackState']['0'], out
assert '_soloHiddenBase' not in out['trackState']['0'], out

# Direct render entrypoints call normalize_track_solo before building their asset
# maps. Keep media identity canonical here too so numeric/string legacy IDs and
# the valid zero ID cannot disappear between browser QA/preview and FFmpeg.
media={
    'assets':[
        {'id':0,'name':'zero.mp4','type':'video'},
        {'id':' 7 ','name':'seven.mp4','type':'video'},
    ],
    'clips':[
        {'id':'c0','track':'0.0','asset':'0','start':0,'duration':1},
        {'id':'c7','track':1,'asset':7,'start':1,'duration':1},
    ],
}
out=normalize_track_solo(media)
assert [a['id'] for a in out['assets']]==['0','7'], out
assert [c['asset'] for c in out['clips']]==['0','7'], out
assert [c['track'] for c in out['clips']]==[0,1], out
assert media['assets'][0]['id']==0, media  # render normalization remains non-mutating
assert media['clips'][1]['asset']==7, media

# Numeric string aliases remain compatible, including leading zeroes, decimal
# integer notation and negative zero used by some imported JSON producers.
alias_tracks={'clips':[
    {'id':'voice','track':'06'},
    {'id':'sfx','track':'4.0'},
    {'id':'base','track':'-0'},
]}
out=normalize_track_solo(alias_tracks)
assert [c['track'] for c in out['clips']]==[6,4,0], out

# Python normally coerces booleans to numbers. Render normalization must not turn
# corrupt JSON true/false track values into tracks 1/0, where they could become
# real visual layers after the strict import/QA guards have already rejected them.
invalid_tracks={'clips':[
    {'id':'true-track','track':True},
    {'id':'false-track','track':False},
    {'id':'object-track','track':{'value':1}},
    {'id':'array-track','track':[6]},
]}
out=normalize_track_solo(invalid_tracks)
assert out['clips'][0]['track'] is True, out
assert out['clips'][1]['track'] is False, out
assert out['clips'][2]['track']=={'value':1}, out
assert out['clips'][3]['track']==[6], out

# Persisted state flags are strict booleans. Truthy corrupt values must never hide,
# mute or Solo real tracks during export, while genuine legacy True still applies.
corrupt_flags={
    'trackState':{
        '0':{'hidden':'false'},
        '1':{'solo':1},
        '4':{'muted':{'value':True}},
        '5':{'solo':['true']},
        '06':{'muted':True},
    }
}
out=normalize_track_solo(corrupt_flags)
assert out['trackState']['0']['hidden'] is False, out
assert out['trackState']['1'].get('solo') is False, out
assert out['trackState']['4']['muted'] is False, out
assert out['trackState']['5'].get('solo') is False, out
assert out['trackState']['6']['muted'] is True, out
# Corrupt Solo values did not accidentally hide/mute siblings.
assert out['trackState']['2']['hidden'] is False, out
assert out['trackState']['4']['muted'] is False, out

print('Legacy track-state/media render normalization OK')
