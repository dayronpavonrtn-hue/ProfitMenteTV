#!/usr/bin/env python3
from output_qc import expected_audio_duration, project_expects_audio


def expect_audio(project, expected=True):
    actual=project_expects_audio(project)
    assert actual is expected, (project, actual, expected)


# Numeric aliases for legacy projects resolve to the same media identity.
video_alias={
    'duration':12,
    'assets':[{'id':'007','type':'video'}],
    'clips':[{'track':'00','asset':'+07.000','duration':12,'sourceVolume':1}],
}
expect_audio(video_alias)
assert expected_audio_duration(video_alias) == 12

# Numeric media id zero remains valid and -0 aliases the visual track zero.
zero_media={
    'duration':9,
    'assets':[{'id':0,'type':'video'}],
    'clips':[{'track':'-0','asset':'-0','duration':9,'sourceVolume':1}],
}
expect_audio(zero_media)
assert expected_audio_duration(zero_media) == 9

# Booleans must never coerce into track/media ids (False -> 0 / True -> 1).
boolean_track={'assets':[{'id':0,'type':'video'}],'clips':[{'track':False,'asset':0,'duration':8,'sourceVolume':1}]}
expect_audio(boolean_track, False)
boolean_asset={'assets':[{'id':0,'type':'video'}],'clips':[{'track':0,'asset':False,'duration':8,'sourceVolume':1}]}
expect_audio(boolean_asset, False)

# Non-scalar ids are invalid rather than becoming strings such as "{'id': 7}".
object_asset={'assets':[{'id':{'id':7},'type':'video'}],'clips':[{'track':0,'asset':{'id':7},'duration':8,'sourceVolume':1}]}
expect_audio(object_asset, False)

# Text ids remain text ids and stay case-sensitive.
text_case={'assets':[{'id':'VoiceA','type':'video'}],'clips':[{'track':0,'asset':'voicea','duration':8,'sourceVolume':1}]}
expect_audio(text_case, False)

# Modern and legacy track-state aliases are merged conservatively.
legacy_muted={
    'duration':10,
    'trackStates':{'05':{'muted':True}},
    'clips':[{'track':'+5.0','duration':10}],
}
expect_audio(legacy_muted, False)
assert expected_audio_duration(legacy_muted) == 0

modern_hidden={
    'duration':10,
    'assets':[{'id':3,'type':'video'}],
    'trackState':{'00':{'hidden':True}},
    'clips':[{'track':0,'asset':3,'duration':10,'sourceVolume':1}],
}
expect_audio(modern_hidden, False)

# A false value in one map must not clear a protective true value in the other.
merged_muted={
    'duration':10,
    'trackStates':{'5':{'muted':True}},
    'trackState':{'05':{'muted':False}},
    'clips':[{'track':5,'duration':10}],
}
expect_audio(merged_muted, False)

# Fractional / out-of-range tracks are invalid and cannot create phantom audio expectations.
for track in (5.5, '6.2', 7, '-1', '', None, True):
    expect_audio({'clips':[{'track':track,'duration':6}]}, False)

print('output qc identity ok')
