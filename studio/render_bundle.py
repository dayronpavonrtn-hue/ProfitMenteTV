#!/usr/bin/env python3
"""Render a .profitmente.tar exported by Studio to MP4 with local FFmpeg.

The requested output path is treated as a published artifact: rendering and QA
happen on a sibling candidate file first. The previous good MP4 is therefore
preserved if FFmpeg, decode verification or post-render QA fails.
"""
import json,pathlib,sys,tarfile,tempfile,subprocess,os,uuid
from media_identity import normalize_project_media_ids
from track_state_render import normalize_track_solo
from render_progress import write_progress


def safe_extract_bundle(tar, destination):
    """Extract only normal files/directories that stay inside destination.

    ProfitMente bundles are locally generated and need no symlinks, hardlinks,
    devices or FIFOs. Rejecting them avoids link-based traversal that a simple
    resolved member-name check cannot prevent when using TarFile.extractall().
    Duplicate paths are rejected too so a later member cannot silently replace
    a project or asset that was already validated by the archive walk.
    """
    destination = pathlib.Path(destination).resolve()
    seen = set()
    members = tar.getmembers()
    for member in members:
        name = member.name.replace('\\', '/')
        if not name or name.startswith('/'):
            raise RuntimeError(f'Ruta insegura en bundle: {member.name}')
        target = (destination / name).resolve()
        if target != destination and destination not in target.parents:
            raise RuntimeError(f'Ruta insegura en bundle: {member.name}')
        key = target.as_posix().casefold()
        if key in seen:
            raise RuntimeError(f'Ruta duplicada en bundle: {member.name}')
        seen.add(key)
        if member.issym() or member.islnk():
            raise RuntimeError(f'Enlace no permitido en bundle: {member.name}')
        if not (member.isdir() or member.isfile()):
            raise RuntimeError(f'Tipo de archivo no permitido en bundle: {member.name}')
    tar.extractall(destination, members=members)


if len(sys.argv)!=3: raise SystemExit('Usage: render_bundle.py bundle.profitmente.tar output.mp4')
bundle=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); root=pathlib.Path(__file__).resolve().parent
if not bundle.is_file(): raise FileNotFoundError(bundle)
out.parent.mkdir(parents=True,exist_ok=True)
# Keep the candidate in the same directory as the final output so os.replace is
# an atomic filesystem rename on normal local filesystems. Preserve .mp4 as the
# final suffix so FFmpeg can infer the output container without extra flags.
candidate=out.with_name(f'.{out.stem}.rendering-{uuid.uuid4().hex[:10]}{out.suffix or ".mp4"}')
candidate_report=candidate.with_suffix(candidate.suffix+'.qc.json')
final_report=out.with_suffix(out.suffix+'.qc.json')
write_progress(12,'Abriendo paquete')
try:
    with tempfile.TemporaryDirectory(prefix='profitmente-bundle-') as td:
        td=pathlib.Path(td)
        with tarfile.open(bundle,'r:') as tar:
            safe_extract_bundle(tar, td)
        project=td/'project.json'; assets=td/'assets'
        if not project.is_file(): raise RuntimeError('Bundle inválido: falta project.json')
        assets.mkdir(exist_ok=True)
        # Solo is semantic state, not just a browser UI effect. Re-derive hidden/muted
        # before validation so non-Solo offline media is not required and preview,
        # validation, FFmpeg and post-render QA all consume the same effective tracks.
        # Canonicalize media identities at this boundary too: browser preview/QA treats
        # numeric/string legacy IDs (including 0) as the same asset, so every Python
        # stage must receive the same canonical references before strict lookups begin.
        data=json.loads(project.read_text(encoding='utf-8'))
        data=normalize_project_media_ids(normalize_track_solo(data))
        project.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
        write_progress(18,'Validando estructura del proyecto')
        subprocess.run([sys.executable,str(root/'validate_project.py'),str(project),str(assets)],check=True)
        # Imported/legacy JSON can contain arbitrary visual enum values. The renderer
        # used to silently coerce them, which could make MP4 differ from Studio preview.
        # Fail before probing/rendering and tell the user exactly which clip is incompatible.
        write_progress(21,'Verificando paridad preview → MP4')
        subprocess.run([sys.executable,str(root/'render_parity_preflight.py'),str(project)],check=True)
        # Probe only active media before composition. This catches truncated/corrupt
        # files and wrong stream types early, before an expensive FFmpeg composition.
        write_progress(24,'Comprobando medios activos con FFprobe')
        subprocess.run([sys.executable,str(root/'media_preflight.py'),str(project),str(assets)],check=True)
        write_progress(30,'Preparando composición')
        subprocess.run([sys.executable,str(root/'render_motion_text.py'),str(project),str(assets),str(candidate)],check=True)
        # A complete container/metadata probe is not enough: force FFmpeg to decode the
        # entire finished video/audio bitstream before any render can be accepted.
        write_progress(84,'Verificando decodificación completa')
        subprocess.run([sys.executable,str(root/'verify_render_decode.py'),str(candidate)],check=True)
        write_progress(92,'Ejecutando control de calidad')
        qc=subprocess.run([sys.executable,str(root/'output_qc.py'),str(project),str(candidate),str(candidate_report)],capture_output=True,text=True)
        if qc.returncode!=0:
            detail=(qc.stdout or qc.stderr or 'Post-render QA falló').strip()
            raise RuntimeError(detail)
        data=json.loads(candidate_report.read_text(encoding='utf-8'))
        if not data.get('ok'):
            raise RuntimeError('Post-render QA no aprobó el MP4 candidato.')
        write_progress(97,'Publicando MP4 validado')
        # Never touch a previously valid output until the complete candidate has
        # passed render, full decode and QC. os.replace is atomic for same-volume
        # paths, so consumers never observe a half-written final MP4.
        os.replace(candidate,out)
        os.replace(candidate_report,final_report)
        write_progress(98,'Finalizando MP4 validado')
        print(f"Post-render QA {data.get('score',0)}/100 OK")
    print(f'Bundle render QA OK: {out}')
finally:
    # Failed/cancelled renders must not accumulate large hidden candidates.
    for path in (candidate,candidate_report):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
