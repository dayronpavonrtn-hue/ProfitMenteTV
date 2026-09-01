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
print('Legacy track-state render normalization OK')
