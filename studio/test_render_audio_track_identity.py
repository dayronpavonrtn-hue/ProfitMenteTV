#!/usr/bin/env python3
"""Regression for strict track identity in the local FFmpeg audio bridge."""
from __future__ import annotations
import json
import pathlib
import subprocess
import sys
import tempfile

from track_state_render import normalize_track_solo

ROOT=pathlib.Path(__file__).resolve().parent

# Preserve supported legacy numeric aliases, but never let booleans become 0/1.
normalized=normalize_track_solo({
    'clips':[
        {'id':'legacy-voice','track':'06'},
        {'id':'poison-bool','track':True},
        {'id':'poison-text','track':'6x'},
        {'id':'poison-fraction','track':5.5},
    ]
})
by_id={c['id']:c for c in normalized['clips']}
assert by_id['legacy-voice']['track']==6
assert by_id['poison-bool']['track'] is True
assert by_id['poison-text']['track']=='6x'
assert by_id['poison-fraction']['track']==5.5

# Malformed tracks must be ignored before asset probing. Each asset deliberately
# points at a missing file; any accidental track coercion would therefore fail.
with tempfile.TemporaryDirectory(prefix='profitmente-audio-track-id-') as td:
    td=pathlib.Path(td)
    assets=td/'assets'; assets.mkdir()
    video=td/'video-only.mp4'; output=td/'out.mp4'; project_path=td/'project.json'
    sentinel=b'profitmente-video-sentinel'
    video.write_bytes(sentinel)
    project={
        'duration':1,
        'assets':[
            {'id':'bool-video','type':'video','name':'missing-bool.mp4'},
            {'id':'text-audio','type':'audio','name':'missing-text.wav'},
            {'id':'fraction-audio','type':'audio','name':'missing-fraction.wav'},
        ],
        'clips':[
            {'id':'bool','track':True,'asset':'bool-video','start':0,'duration':1},
            {'id':'text','track':'6x','asset':'text-audio','start':0,'duration':1},
            {'id':'fraction','track':5.5,'asset':'fraction-audio','start':0,'duration':1},
        ],
    }
    project_path.write_text(json.dumps(project),encoding='utf-8')
    run=subprocess.run(
        [sys.executable,str(ROOT/'render_audio_mix.py'),str(project_path),str(assets),str(video),str(output)],
        cwd=str(ROOT),capture_output=True,text=True
    )
    assert run.returncode==0, run.stderr or run.stdout
    assert output.read_bytes()==sentinel
    assert 'sin pistas audibles' in run.stdout

source=(ROOT/'render_audio_mix.py').read_text(encoding='utf-8')
assert "int(c.get('track'" not in source
assert 'type(value) is int' in source
print('Render audio strict track identity QA OK')
