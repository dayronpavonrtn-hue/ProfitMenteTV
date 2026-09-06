class ProfitMenteFilmstripEngine{
  constructor(){this.cache=new Map();this.pending=new Map();this.maxFrames=8}
  identity(value){
    if(value===null||value===undefined||typeof value==='boolean')return '';
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:'';
    if(typeof value!=='string')return '';
    const text=value.trim();if(!text)return '';
    if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)){
      const number=Number(text);if(Number.isFinite(number))return `n:${Object.is(number,-0)?0:number}`;
    }
    return `s:${text}`;
  }
  sameId(left,right){const a=this.identity(left),b=this.identity(right);return !!a&&a===b}
  track(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='string'&&!value.trim())return null;
    const number=Number(value);if(!Number.isFinite(number)||!Number.isInteger(number)||number<0||number>6)return null;
    return Object.is(number,-0)?0:number;
  }
  sourceWindow(clip,sourceDuration){
    const total=Number(sourceDuration);if(!Number.isFinite(total)||total<=0)return {start:0,end:0};
    if(!clip||typeof clip!=='object')return {start:0,end:total};
    const rawOffset=Number(clip.sourceOffset),rawDuration=Number(clip.duration),rawSpeed=Number(clip.speed);
    const start=Number.isFinite(rawOffset)?Math.max(0,Math.min(total,rawOffset)):0;
    const speed=Number.isFinite(rawSpeed)&&rawSpeed>0?rawSpeed:1;
    const timelineDuration=Number.isFinite(rawDuration)&&rawDuration>0?rawDuration:0;
    if(!timelineDuration||start>=total)return {start,end:total};
    const end=Math.max(start,Math.min(total,start+timelineDuration*speed));
    return {start,end};
  }
  key(asset,count,clip){
    const offset=Number(clip?.sourceOffset),duration=Number(clip?.duration),speed=Number(clip?.speed);
    const range=`${Number.isFinite(offset)?offset:0}:${Number.isFinite(duration)?duration:'all'}:${Number.isFinite(speed)&&speed>0?speed:1}`;
    return `${this.identity(asset.id)}:${asset.blob?.size||0}:${count}:${range}`;
  }
  async frames(asset,count=6,clip=null){
    if(!asset?.blob||asset.type!=='video')return [];
    count=Math.max(2,Math.min(this.maxFrames,Math.round(count)));
    const key=this.key(asset,count,clip);if(this.cache.has(key))return this.cache.get(key);if(this.pending.has(key))return this.pending.get(key);
    const job=this.capture(asset,count,clip).then(frames=>{this.cache.set(key,frames);return frames}).catch(err=>{console.warn('Filmstrip omitido',asset.name,err);return asset.thumbnail?[asset.thumbnail]:[]}).finally(()=>this.pending.delete(key));
    this.pending.set(key,job);return job;
  }
  capture(asset,count,clip=null){return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(asset.blob),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='metadata';let frames=[],index=0,done=false;
    const close=(value,error)=>{if(done)return;done=true;URL.revokeObjectURL(url);video.removeAttribute('src');video.load();error?reject(error):resolve(value)};
    const snap=()=>{try{const w=video.videoWidth,h=video.videoHeight;if(!w||!h)throw new Error('Video sin dimensiones');const targetW=180,targetH=Math.max(70,Math.round(targetW*h/w)),canvas=document.createElement('canvas');canvas.width=targetW;canvas.height=targetH;canvas.getContext('2d').drawImage(video,0,0,targetW,targetH);frames.push(canvas.toDataURL('image/jpeg',.58));index++;seek()}catch(e){close(frames.length?frames:null,e)}};
    const seek=()=>{
      if(index>=count)return close(frames);
      const duration=Number.isFinite(video.duration)?video.duration:0;if(duration<=0)return close(asset.thumbnail?[asset.thumbnail]:[]);
      const range=this.sourceWindow(clip,duration),span=Math.max(0,range.end-range.start);
      if(span<=.001)return close(asset.thumbnail?[asset.thumbnail]:[]);
      const edge=Math.min(.04,span/4),t=Math.min(range.end-edge,Math.max(range.start+edge,range.start+span*((index+.5)/count)));
      video.onseeked=snap;try{video.currentTime=Math.max(0,Math.min(duration,t))}catch(e){close(frames.length?frames:null,e)}
    };
    video.onloadedmetadata=seek;video.onerror=()=>close(null,new Error('No se pudo leer el video'));video.src=url;
  })}
  async decorate(project,assets,root=document){
    const clips=[...root.querySelectorAll('.clip[data-id]')];
    await Promise.all(clips.map(async el=>{
      const clip=(project?.clips||[]).find(c=>this.sameId(c.id,el.dataset.id));if(!clip||![0,1].includes(this.track(clip.track))||!this.identity(clip.asset))return;
      const asset=(assets||[]).find(a=>this.sameId(a.id,clip.asset));if(!asset||!['video','image'].includes(asset.type))return;
      let strip=el.querySelector('.filmstrip');if(!strip){strip=document.createElement('span');strip.className='filmstrip';el.prepend(strip)}
      if(asset.type==='image'){if(asset.thumbnail)strip.style.backgroundImage=`url("${asset.thumbnail}")`;strip.classList.add('single');return}
      strip.style.backgroundImage='';
      const count=Math.max(2,Math.min(this.maxFrames,Math.ceil(el.clientWidth/70))),frames=await this.frames(asset,count,clip);if(!el.isConnected||!frames.length)return;
      strip.classList.toggle('single',frames.length===1);strip.replaceChildren(...frames.map(src=>{const img=document.createElement('img');img.src=src;img.alt='';img.draggable=false;return img}));
    }))
  }
}
window.ProfitMenteFilmstripEngine=ProfitMenteFilmstripEngine;
(()=>{
  const css=document.createElement('style');css.textContent='.clip{isolation:isolate}.clip .filmstrip{position:absolute;inset:0 6px 0 0;display:flex;overflow:hidden;opacity:.58;pointer-events:none;z-index:-1;border-radius:3px}.clip .filmstrip img{height:100%;min-width:0;flex:1 1 0;object-fit:cover}.clip .filmstrip.single{background-size:cover;background-position:center}.clip .filmstrip.single img{width:100%}.clip:has(.filmstrip){text-shadow:0 1px 3px #000,0 0 2px #000;background:#1a2431}';document.head.appendChild(css);
  const engine=new ProfitMenteFilmstripEngine();window.profitMenteFilmstrip=engine;
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(typeof project==='undefined'||typeof assets==='undefined')return;engine.decorate(project,assets).catch(console.warn)})};
  const install=()=>{
    const tracks=document.querySelector('#tracks');if(!tracks)return false;
    if(!tracks.__filmstripObserver){
      const observer=new MutationObserver(schedule);observer.observe(tracks,{childList:true});tracks.__filmstripObserver=observer;
    }
    schedule();return true;
  };
  if(!install())window.addEventListener('DOMContentLoaded',install,{once:true});
})();