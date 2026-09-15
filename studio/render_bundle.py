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
    """Extract only normal files/directories that stay inside destination."""
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
        # Validate raw container shape before normalization. Normalizers and the MP4
        # compositor assume clips/assets are arrays of objects; malformed imports
        # must fail with a controlled preflight error instead of crashing or letting
        # duplicate asset IDs select an arbitrary file.
        write_progress(14,'Verificando estructura base del proyecto')
        subprocess.run([sys.executable,str(root/'project_structure_preflight.py'),str(project)],check=True)
        data=json.loads(project.read_text(encoding='utf-8'))
        data=normalize_project_media_ids(normalize_track_solo(data))
        project.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
        write_progress(16,'Verificando identidad de clips')
        subprocess.run([sys.executable,str(root/'clip_identity_preflight.py'),str(project)],check=True)
        write_progress(18,'Validando estructura del proyecto')
        subprocess.run([sys.executable,str(root/'validate_project.py'),str(project),str(assets)],check=True)
        # render_mp4 clamps composition to project.duration. Reject active clips that
        # extend beyond that boundary so export can never silently shorten an edit.
        write_progress(20,'Verificando límites de la timeline')
        subprocess.run([sys.executable,str(root/'timeline_bounds_preflight.py'),str(project)],check=True)
        write_progress(21,'Verificando paridad preview → MP4')
        subprocess.run([sys.executable,str(root/'render_parity_preflight.py'),str(project)],check=True)
        write_progress(24,'Comprobando medios activos con FFprobe')
        subprocess.run([sys.executable,str(root/'media_preflight.py'),str(project),str(assets)],check=True)
        write_progress(30,'Preparando composición')
        subprocess.run([sys.executable,str(root/'render_motion_text.py'),str(project),str(assets),str(candidate)],check=True)
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
        os.replace(candidate,out)
        os.replace(candidate_report,final_report)
        write_progress(98,'Finalizando MP4 validado')
        print(f"Post-render QA {data.get('score',0)}/100 OK")
    print(f'Bundle render QA OK: {out}')
finally:
    for path in (candidate,candidate_report):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
