#!/usr/bin/env python3
from output_qc import parse_blackdetect, parse_silencedetect, parse_freezedetect, analyze_signals

black_log = '''
[blackdetect @ x] black_start:1.2 black_end:2.8 black_duration:1.6
[blackdetect @ x] black_start:10 black_end:15 black_duration:5
'''
black = parse_blackdetect(black_log)
assert len(black) == 2
assert black[0] == {'start': 1.2, 'end': 2.8, 'duration': 1.6}
assert black[1]['duration'] == 5

silence_log = '''
[silencedetect @ x] silence_start: 0
[silencedetect @ x] silence_end: 2.5 | silence_duration: 2.5
[silencedetect @ x] silence_start: 8
'''
silence = parse_silencedetect(silence_log, 12)
assert len(silence) == 2
assert silence[0] == {'start': 0.0, 'end': 2.5, 'duration': 2.5}
assert silence[1] == {'start': 8.0, 'end': 12, 'duration': 4.0}

freeze_log = '''
[freezedetect @ x] lavfi.freezedetect.freeze_start: 1.5
[freezedetect @ x] lavfi.freezedetect.freeze_duration: 3.25
[freezedetect @ x] lavfi.freezedetect.freeze_end: 4.75
[freezedetect @ x] lavfi.freezedetect.freeze_start: 8
'''
freeze = parse_freezedetect(freeze_log, 12)
assert len(freeze) == 2, freeze
assert freeze[0] == {'start': 1.5, 'end': 4.75, 'duration': 3.25}
assert freeze[1] == {'start': 8.0, 'end': 12, 'duration': 4.0}

project = {'format': '9:16', 'duration': 10, 'clips': [{'track': 0, 'duration': 10}, {'track': 6, 'duration': 10}]}
severe = analyze_signals(
    project,
    10,
    [{'start': 1, 'end': 5.2, 'duration': 4.2}],
    [{'start': 0, 'end': 9, 'duration': 9}],
    [{'start': 0, 'end': 8.5, 'duration': 8.5}],
)
assert len(severe['issues']) == 3, severe
assert severe['metrics']['longest_black'] == 4.2
assert severe['metrics']['silence_seconds'] == 9
assert severe['metrics']['freeze_seconds'] == 8.5

warning = analyze_signals(
    project,
    20,
    [{'start': 3, 'end': 5.6, 'duration': 2.6}],
    [{'start': 4, 'end': 9.2, 'duration': 5.2}],
    [{'start': 11, 'end': 15.5, 'duration': 4.5}],
)
assert not warning['issues'], warning
assert len(warning['warnings']) == 3, warning
assert warning['metrics']['longest_freeze'] == 4.5

healthy = analyze_signals(project, 20, [], [], [{'start': 2, 'end': 3.0, 'duration': 1.0}])
assert not healthy['issues'] and not healthy['warnings'], healthy

silent_project = {'format': '1:1', 'duration': 8, 'clips': [{'track': 0, 'duration': 8}]}
no_audio_issue = analyze_signals(silent_project, 8, [], [{'start': 0, 'end': 8, 'duration': 8}])
assert not no_audio_issue['issues'] and not no_audio_issue['warnings']

muted = {'duration': 8, 'trackState': {'5': {'muted': True}}, 'clips': [{'track': 5, 'duration': 8}]}
muted_result = analyze_signals(muted, 8, [], [{'start': 0, 'end': 8, 'duration': 8}])
assert not muted_result['issues'] and not muted_result['warnings']

print('output signal qc ok')
