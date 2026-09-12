#!/usr/bin/env python3
"""Regression: explicit zero motion-text coordinates must survive MP4 command generation."""
from __future__ import annotations
import json
import os
import pathlib
import stat
import subprocess
import sys
import tempfile

ROOT=pathlib.Path(__file__).resolve().parent


def executable(path: pathlib.Path, body: str) -> None:
    path.write_text(body, encoding='utf-8')
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root=pathlib.Path(tmp)
        bin_dir=root/'bin'; bin_dir.mkdir()
        executable(bin_dir/'ffmpeg', '#!/bin/sh\nexit 0\n')
        executable(bin_dir/'ffprobe', '#!/bin/sh\nprintf \'%s\\n\' \'{"streams":[{"codec_type":"video","codec_name":"h264","width":1080,"height":1920,"r_frame_rate":"30/1"}],"format":{"duration":"1.0","size":"1"}}\'\n')
        project={
            'format':'9:16','duration':1,'fps':30,'assets':[],
            'clips':[{
                'id':'motion-zero','track':2,'name':'CENTER','start':0,'duration':1,
                'fontSize':40,'textX':0,'textY':0,'boxOpacity':0,
                'textAnimation':'none','textStyle':'title'
            }]
        }
        project_path=root/'project.json'; project_path.write_text(json.dumps(project), encoding='utf-8')
        assets=root/'assets'; assets.mkdir(); output=root/'out.mp4'
        env=dict(os.environ); env['PATH']=str(bin_dir)+os.pathsep+env.get('PATH','')
        run=subprocess.run(
            [sys.executable,str(ROOT/'render_mp4.py'),str(project_path),str(assets),str(output)],
            cwd=str(ROOT),env=env,capture_output=True,text=True
        )
        if run.returncode:
            raise AssertionError(run.stderr or run.stdout)
        command=run.stdout
        assert "h*0.0/100" in command, command
        assert "w*0.0/100" in command, command
        assert "boxcolor=0x000000@0.000" in command, command
        assert "h*-28" not in command, command
    print('motion text zero-coordinate render regression: OK')


if __name__=='__main__':
    main()
