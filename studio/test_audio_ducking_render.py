#!/usr/bin/env python3
import array,json,math,pathlib,subprocess,sys,tempfile

ROOT=pathlib.Path(__file__).resolve().parent
MIXER=ROOT/'render_audio_mix.py'


def run(cmd):
    return subprocess.run(cmd,check=True,capture_output=True)

def rms_db(path,start,duration=.7):
    raw=run(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(start),'-t',str(duration),'-i',str(path),'-map','0:a:0','-ac','1','-ar','48000','-f','f32le','pipe:1']).stdout
    samples=array.array('f'); samples.frombytes(raw)
    if not samples:return -120.0
    rms=math.sqrt(sum(float(x)*float(x) for x in samples)/len(samples))
    return 20*math.log10(max(rms,1e-9))

with tempfile.TemporaryDirectory(prefix='profitmente-duck-render-') as td:
    td=pathlib.Path(td); assets=td/'assets'; assets.mkdir(); video=td/'video.mp4'; music=assets/'music.wav'; voice=assets/'voice.wav'; output=td/'out.mp4'
    run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=320x240:r=30:d=6','-c:v','libx264','-pix_fmt','yuv420p','-an',str(video)])
    run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=6','-c:a','pcm_s16le',str(music)])
    run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','2','-c:a','pcm_s16le',str(voice)])
    project={
      'duration':6,
      'assets':[{'id':'music','name':'music.wav','type':'audio'},{'id':'voice','name':'voice.wav','type':'audio'}],
      'clips':[
        {'id':'m1','track':5,'asset':'music','start':0,'duration':6,'volume':.8,'duckVolume':.1,'fadeIn':0,'fadeOut':0},
        {'id':'v1','track':6,'asset':'voice','start':2,'duration':2,'volume':1,'fadeIn':0,'fadeOut':0}
      ]
    }
    project_path=td/'project.json'; project_path.write_text(json.dumps(project),encoding='utf-8')
    run([sys.executable,str(MIXER),str(project_path),str(assets),str(video),str(output)])
    before=rms_db(output,.7); during=rms_db(output,2.7); after=rms_db(output,4.7)
    assert abs(before-after)<1.0,(before,after)
    assert before-during>14.0,(before,during,after)
    probe=json.loads(run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(output)]).stdout)
    kinds={s.get('codec_type') for s in probe.get('streams',[])}
    assert {'video','audio'}<=kinds,kinds

    # Disabling ducking must leave music level unchanged while the voice clip exists.
    project['clips'][0]['ducking']=False; project_path.write_text(json.dumps(project),encoding='utf-8'); no_duck=td/'no-duck.mp4'
    run([sys.executable,str(MIXER),str(project_path),str(assets),str(video),str(no_duck)])
    nd_before=rms_db(no_duck,.7); nd_during=rms_db(no_duck,2.7)
    assert abs(nd_before-nd_during)<1.0,(nd_before,nd_during)

    wiring=(ROOT/'render_motion_text.py').read_text(encoding='utf-8')
    assert "render_audio_mix.py" in wiring and "video-only.mp4" in wiring
    print(f'audio ducking render regression: ok · before={before:.1f} dB · during={during:.1f} dB · after={after:.1f} dB')
