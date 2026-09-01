#!/usr/bin/env python3
"""Compatibility entrypoint for ProfitMente Motion renders.
Motion text is composited directly by render_mp4.py, avoiding a second H.264 encode.
Long captions and Motion titles are normalized only for the render copy so the
saved Studio project remains unchanged. Final audio is mixed separately so the
MP4 matches WebAudio preview ducking, track gain, fades and source-video audio.
"""
import copy,json,pathlib,subprocess,sys,tempfile
from caption_compact import compact_project_captions
from motion_text_layout import expand_motion_text
from render_progress import write_progress
from track_state_render import normalize_track_solo

if len(sys.argv)!=4:
    raise SystemExit('Usage: render_motion_text.py project.json assets_dir output.mp4')
root=pathlib.Path(__file__).resolve().parent
project_path=pathlib.Path(sys.argv[1])
project=normalize_track_solo(json.loads(project_path.read_text(encoding='utf-8')))
render_project=expand_motion_text(compact_project_captions(project))

# render_mp4.py remains the visual compositor. Suppress every audio source in
# its temporary copy, then create the final soundtrack once in render_audio_mix.py.
# Visual clips are still drawn when muted; muted only disables their source audio.
video_project=copy.deepcopy(render_project)
for clip in video_project.get('clips',[]):
    track=int(clip.get('track',-1))
    if track in (0,1,4,5,6): clip['muted']=True

with tempfile.TemporaryDirectory(prefix='profitmente-render-project-') as td:
    td=pathlib.Path(td)
    normalized=td/'project.normalized.json'
    prepared=td/'project.render.json'
    video_only=td/'video-only.mp4'
    normalized.write_text(json.dumps(project,ensure_ascii=False),encoding='utf-8')
    # render_bundle.py already performs this inexpensive gate, but this entrypoint
    # is also used directly by tests/tools. Keep it self-contained so imported or
    # recovered projects cannot bypass Preview → MP4 compatibility checks and be
    # silently coerced by the low-level FFmpeg compositor.
    write_progress(31,'Verificando paridad preview → MP4')
    subprocess.run([sys.executable,str(root/'render_parity_preflight.py'),str(normalized)],check=True)
    prepared.write_text(json.dumps(video_project,ensure_ascii=False),encoding='utf-8')
    write_progress(35,'Componiendo video y gráficos')
    subprocess.run([sys.executable,str(root/'render_mp4.py'),str(prepared),sys.argv[2],str(video_only)],check=True)
    audio_project=td/'project.audio.json'
    audio_project.write_text(json.dumps(render_project,ensure_ascii=False),encoding='utf-8')
    write_progress(72,'Mezclando narración, música y SFX')
    subprocess.run([sys.executable,str(root/'render_audio_mix.py'),str(audio_project),sys.argv[2],str(video_only),sys.argv[3]],check=True)
    write_progress(82,'Video y audio integrados')
print(f'Motion text, captions y mezcla de audio integrados: {sys.argv[3]}')
