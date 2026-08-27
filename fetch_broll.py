import os,json,urllib.parse,urllib.request
from pathlib import Path
KEY=os.getenv('PEXELS_API_KEY','').strip(); OUT=Path('assets/broll');OUT.mkdir(parents=True,exist_ok=True)
queries=['artificial intelligence technology','entrepreneur working laptop','digital marketing business','automation computer technology','business problem solving','startup success technology']
if not KEY:
 print('PEXELS_API_KEY missing; keeping fallback visual engine')
 raise SystemExit(0)
credits=[]
for i,q in enumerate(queries):
 url='https://api.pexels.com/v1/videos/search?'+urllib.parse.urlencode({'query':q,'orientation':'portrait','size':'medium','per_page':8})
 req=urllib.request.Request(url,headers={'Authorization':KEY})
 with urllib.request.urlopen(req,timeout=30) as r: data=json.load(r)
 videos=data.get('videos',[])
 if not videos: continue
 v=videos[i%len(videos)]; files=v.get('video_files',[])
 files=sorted(files,key=lambda x:abs((x.get('width') or 1080)-1080)+abs((x.get('height') or 1920)-1920))
 if not files: continue
 dest=OUT/f'scene_{i+1}.mp4';urllib.request.urlretrieve(files[0]['link'],dest)
 credits.append({'scene':i+1,'query':q,'creator':v.get('user',{}).get('name'),'pexels_url':v.get('url')})
 print('downloaded',dest)
Path('output').mkdir(exist_ok=True);Path('output/pexels_credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2),encoding='utf-8')
