import os,json,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).parent;OUT=ROOT/'assets'/'broll';OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'scenes.json').read_text(encoding='utf-8'))['scenes'];KEY=os.getenv('PEXELS_API_KEY','')
def request_json(url):
 req=urllib.request.Request(url,headers={'Authorization':KEY,'User-Agent':'ProfitMenteTV/1.0'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
def score(v):
 duration=float(v.get('duration') or 0);files=v.get('video_files',[])
 portrait=any((x.get('height') or 0)>(x.get('width') or 0) for x in files);hd=max([x.get('height') or 0 for x in files] or [0])
 # Prefer portrait, 5-20 second clips and enough resolution for Shorts/Reels.
 duration_score=1200 if 5<=duration<=20 else max(0,800-abs(duration-10)*40)
 return (5000 if portrait else 0)+duration_score+min(hd,1920)
def best_file(video):
 files=video.get('video_files',[]);portrait=[x for x in files if (x.get('height') or 0)>(x.get('width') or 0)];pool=portrait or files
 suitable=[x for x in pool if int(x.get('height') or 0)>=1280 and int(x.get('width') or 0)>=720] or pool
 return min(suitable,key=lambda x:abs((x.get('height') or 0)-1920)+abs((x.get('width') or 0)-1080)) if suitable else None
def download(url,dest):
 req=urllib.request.Request(url,headers={'User-Agent':'ProfitMenteTV/1.0'})
 with urllib.request.urlopen(req,timeout=90) as src,open(dest,'wb') as dst:
  while True:
   chunk=src.read(1024*1024)
   if not chunk:break
   dst.write(chunk)
 if dest.stat().st_size<100000: raise RuntimeError('Downloaded B-roll file is unexpectedly small: '+str(dest))
def main():
 if not KEY: raise SystemExit('PEXELS_API_KEY missing: configure GitHub Actions secret before v4 render')
 credits=[];used=set()
 for old in OUT.glob('scene_*.mp4'): old.unlink()
 for i,s in enumerate(PLAN):
  q=s.get('query') or s.get('subtitle') or s.get('title')
  url='https://api.pexels.com/v1/videos/search?per_page=30&orientation=portrait&size=medium&locale=en-US&query='+urllib.parse.quote(q)
  vids=sorted(request_json(url).get('videos',[]),key=score,reverse=True)
  v=next((x for x in vids if x.get('id') not in used),None)
  if not v: raise RuntimeError('No suitable Pexels video for scene '+str(i+1)+' query='+q)
  used.add(v.get('id'));f=best_file(v)
  if not f: raise RuntimeError('No downloadable file for scene '+str(i+1))
  dest=OUT/f'scene_{i+1}.mp4';download(f['link'],dest)
  credits.append({'scene':i+1,'pexels_id':v.get('id'),'creator':v.get('user',{}).get('name','Pexels creator'),'creator_url':v.get('user',{}).get('url',''),'source':v.get('url',''),'query':q,'bytes':dest.stat().st_size})
  print('Scene',i+1,'ready:',dest,'bytes=',dest.stat().st_size)
 (OUT/'credits.json').write_text(json.dumps({'provider':'Pexels','provider_url':'https://www.pexels.com','clips':credits},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
