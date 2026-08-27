import os,json,urllib.parse,urllib.request,random
from pathlib import Path
ROOT=Path(__file__).parent;OUT=ROOT/'assets'/'broll';OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'scenes.json').read_text(encoding='utf-8'))['scenes'];KEY=os.getenv('PEXELS_API_KEY','')
QUERIES=['artificial intelligence futuristic computer','entrepreneur working laptop office','business automation technology workflow','business owner solving problem','startup entrepreneur building company','successful entrepreneur technology office']
def request_json(url):
 req=urllib.request.Request(url,headers={'Authorization':KEY,'User-Agent':'ProfitMenteTV/1.0'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
def score(v):
 duration=v.get('duration') or 0;files=v.get('video_files',[]);portrait=any((x.get('height') or 0)>(x.get('width') or 0) for x in files)
 hd=max([x.get('height') or 0 for x in files] or [0]);return (5000 if portrait else 0)+(min(duration,15)*50)+min(hd,1920)
def best_file(video):
 files=video.get('video_files',[]);portrait=[x for x in files if (x.get('height') or 0)>(x.get('width') or 0)];pool=portrait or files
 suitable=[x for x in pool if 720<=int(x.get('width') or 0)<=1440 and int(x.get('height') or 0)>=1080] or pool
 return min(suitable,key=lambda x:abs((x.get('height') or 0)-1280)+abs((x.get('width') or 0)-720)) if suitable else None
def main():
 if not KEY: raise SystemExit('PEXELS_API_KEY missing: configure GitHub Actions secret before v4 render')
 credits=[];used=set()
 for i,q in enumerate(QUERIES[:len(PLAN)]):
  url='https://api.pexels.com/v1/videos/search?per_page=20&orientation=portrait&size=medium&locale=en-US&query='+urllib.parse.quote(q)
  vids=request_json(url).get('videos',[]);vids=sorted(vids,key=score,reverse=True)
  v=next((x for x in vids if x.get('id') not in used),None)
  if not v: raise RuntimeError('No suitable Pexels video for scene '+str(i+1))
  used.add(v.get('id'));f=best_file(v)
  if not f: raise RuntimeError('No downloadable file for scene '+str(i+1))
  dest=OUT/f'scene_{i+1}.mp4';req=urllib.request.Request(f['link'],headers={'User-Agent':'ProfitMenteTV/1.0'})
  with urllib.request.urlopen(req,timeout=60) as src,open(dest,'wb') as dst:
   while True:
    chunk=src.read(1024*1024)
    if not chunk:break
    dst.write(chunk)
  credits.append({'scene':i+1,'pexels_id':v.get('id'),'creator':v.get('user',{}).get('name','Pexels creator'),'creator_url':v.get('user',{}).get('url',''),'source':v.get('url',''),'query':q})
  print('Scene',i+1,'ready:',dest)
 (OUT/'credits.json').write_text(json.dumps({'provider':'Pexels','provider_url':'https://www.pexels.com','clips':credits},ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
