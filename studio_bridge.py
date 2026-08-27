import argparse, json
from pathlib import Path

TRACKS = ['video','overlay','motion','captions','sfx','music','voice']

def convert(project):
    duration=float(project.get('duration',45))
    fmt=project.get('format','9:16')
    sizes={'9:16':(1080,1920),'16:9':(1920,1080),'1:1':(1080,1080)}
    width,height=sizes.get(fmt,(1080,1920))
    tracks={k:[] for k in TRACKS}
    for clip in project.get('clips',[]):
        idx=int(clip.get('track',0))
        if idx<0 or idx>=len(TRACKS):
            continue
        start=max(0,float(clip.get('start',0)))
        dur=max(.05,float(clip.get('duration',1)))
        item={
            'id':clip.get('id'),
            'name':clip.get('name','Clip'),
            'start':start,
            'end':min(duration,start+dur),
            'asset_id':clip.get('asset'),
        }
        if idx==0:
            item.update({'transition':'cut','zoom_from':1.0,'zoom_to':1.03})
        elif idx==3:
            item.update({'text':clip.get('name',''),'animation':'pop_word','highlight_keywords':True})
        tracks[TRACKS[idx]].append(item)
    return {
        'source':'ProfitMente Studio',
        'project_name':project.get('name','Nuevo video'),
        'mode':project.get('mode','Manual'),
        'format':{'width':width,'height':height,'fps':30},
        'duration':duration,
        'tracks':tracks,
        'features':{'safe_captions':True,'audio_ducking':True,'browser_project':True},
    }

def main():
    ap=argparse.ArgumentParser(description='Convierte un proyecto exportado por ProfitMente Studio al edit_plan v5.')
    ap.add_argument('project', help='JSON exportado por Studio')
    ap.add_argument('-o','--output',default='output/edit_plan_studio.json')
    args=ap.parse_args()
    project=json.loads(Path(args.project).read_text(encoding='utf-8'))
    plan=convert(project)
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
    print(out)

if __name__=='__main__': main()
