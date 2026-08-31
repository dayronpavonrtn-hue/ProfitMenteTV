#!/usr/bin/env python3
"""Normalize ProfitMente Studio track Solo state for non-browser render paths.

The browser Track Solo engine materializes Solo into hidden/muted flags while the
editor is open. Imported/recovered projects can legitimately contain only the
semantic ``solo`` flag (or stale internal Solo bookkeeping), so the local render
pipeline must derive the effective state again before validation and FFmpeg.
"""
from __future__ import annotations
import copy

VISUAL_TRACKS=(0,1,2,3)
AUDIO_TRACKS=(4,5,6)


def _state(states, track):
    value=states.get(str(track),states.get(track,{}))
    return dict(value) if isinstance(value,dict) else {}


def _base_hidden(state):
    if state.get('_soloVisualActive'):
        return bool(state.get('_soloHiddenBase',False))
    return bool(state.get('hidden',False))


def _base_muted(state):
    if state.get('_soloAudioActive'):
        return bool(state.get('_soloMutedBase',False))
    return bool(state.get('muted',False))


def normalize_track_solo(project):
    """Return a deep-copied project with effective hidden/muted Solo state.

    Visual Solo affects tracks 0-3 only; audio Solo affects tracks 4-6 only,
    matching ``track-controls.js``. Manual hidden/muted state is preserved, and
    stale browser-only bookkeeping is removed from the render copy.
    """
    out=copy.deepcopy(project if isinstance(project,dict) else {})
    raw=out.get('trackState')
    raw=raw if isinstance(raw,dict) else {}
    states={i:_state(raw,i) for i in range(7)}
    visual_solo={i for i in VISUAL_TRACKS if bool(states[i].get('solo',False))}
    audio_solo={i for i in AUDIO_TRACKS if bool(states[i].get('solo',False))}

    for i in VISUAL_TRACKS:
        s=states[i]; base=_base_hidden(s)
        s['hidden']=base or (bool(visual_solo) and i not in visual_solo)
        s.pop('_soloHiddenBase',None); s.pop('_soloVisualActive',None)
    for i in AUDIO_TRACKS:
        s=states[i]; base=_base_muted(s)
        s['muted']=base or (bool(audio_solo) and i not in audio_solo)
        s.pop('_soloMutedBase',None); s.pop('_soloAudioActive',None)

    out['trackState']={str(i):states[i] for i in range(7)}
    return out
