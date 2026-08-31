#!/usr/bin/env python3
from output_qc import parse_loudnorm, analyze_loudness, project_expects_audio

log='''[Parsed_loudnorm_0 @ x] {
    "input_i" : "-16.42",
    "input_tp" : "-1.37",
    "input_lra" : "4.20",
    "input_thresh" : "-26.80",
    "output_i" : "-16.00"
}'''
metrics=parse_loudnorm(log)
assert metrics and abs(metrics['integrated_lufs']+16.42)<.01, metrics
assert abs(metrics['true_peak_dbtp']+1.37)<.01, metrics
healthy=analyze_loudness(metrics)
assert not healthy['issues'] and not healthy['warnings'], healthy
quiet=analyze_loudness({'integrated_lufs':-27,'true_peak_dbtp':-2})
assert quiet['warnings'] and not quiet['issues'], quiet
hot=analyze_loudness({'integrated_lufs':-14,'true_peak_dbtp':0.8})
assert hot['issues'], hot

video={'assets':[{'id':'v1','type':'video'}],'clips':[{'track':0,'asset':'v1','duration':5,'sourceVolume':1}]}
assert project_expects_audio(video)
zero_volume={'assets':[{'id':'v1','type':'video'}],'clips':[{'track':0,'asset':'v1','duration':5,'sourceVolume':0}]}
assert not project_expects_audio(zero_volume)
hidden={'assets':[{'id':'v1','type':'video'}],'trackState':{'0':{'hidden':True}},'clips':[{'track':0,'asset':'v1','duration':5}]}
assert not project_expects_audio(hidden)
muted={'assets':[{'id':'v1','type':'video'}],'clips':[{'track':0,'asset':'v1','duration':5,'muted':True}]}
assert not project_expects_audio(muted)

print('output loudness qc ok')
