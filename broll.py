import os,json,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).parent
OUT=ROOT/'assets'/'broll'; OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((ROOT/'scenes.json').read_text(encoding='utf-8'))['scenes']
KEY=os.getenv('PEXELS_API_KEY','')
QUERIES=['artificial intelligence technology','entrepreneur working laptop','business automation computer','business problem solving','startup entrepreneur technology','success business technology']
def request_json(url):
 req=urllib.request.Request(url,headers={'Authorization':KEY,'User-Agent':'ProfitMenteTV/1.0'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
def best_file(video):
 files=video.get('video_files',[])
 portrait=[x for x in files if x.get('height',0)>x.get('width',0)]
 pool=portrait or files
 return min(pool,key=lambda x:abs(x.get('height',0)-1280)+abs(x.get('width',0)-720)) if pool else None
def main():
 if not KEY:
  print('PEXELS_API_KEY not configured; keeping graphic fallback.');return
 credits=[]
 for i,q in enumerate(QUERIES[:len(PLAN)]):
  url='https://api.pexels.com/v1/videos/search?per_page=8&orientation=portrait&query='+urllib.parse.quote(q)
  data=request_json(url); vids=data.get('videos',[])
  if not vids: continue
  v=vids[i%len(vids)]; f=best_file(v)
  if not f: continue
  dest=OUT/f'scene_{i+1}.mp4';urllib.request.urlretrieve(f['link'],dest)
  credits.append({'scene':i+1,'creator':v.get('user',{}).get('name','Pexels creator'),'source':v.get('url','')})
  print('Downloaded',dest)
 (OUT/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
