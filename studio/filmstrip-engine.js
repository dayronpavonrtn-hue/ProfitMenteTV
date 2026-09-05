class ProfitMenteFilmstripEngine{
  constructor(){this.cache=new Map();this.pending=new Map();this.maxFrames=8}
  identity(value){
    if(value===null||value===undefined||typeof value==='boolean')return '';
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:'';
    const text=String(value).trim();if(!text)return '';
    if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)){
      const number=Number(text);if(Number.isFinite(number))return `n:${Object.is(number,-0)?0:number}`;
    }
    return `s:${text}`;
  }
  sameId(left,right){const a=this.identity(left),b=this.identity(right);return !!a&&a===b}
  key(asset,count){return `${this.identity(asset.id)}:${asset.blob?.size||0}:${count}`}
  async frames(asset,count=6){
    if(!asset?.blob||asset.type!=='video')return [];
    count=Math.max(2,Math.min(this.maxFrames,Math.round(count)));
    const key=this.key(asset,count);if(this.cache.has(key))return this.cache.get(key);if(this.pending.has(key))return this.pending.get(key);
    const job=this.capture(asset,count).then(frames=>{this.cache.set(key,frames);return frames}).catch(err=>{console.warn('Filmstrip omitido',asset.name,err);return asset.thumbnail?[asset.thumbnail]:[]}).finally(()=>this.pending.delete(key));
    this.pending.set(key,job);return job;
  }
  capture(asset,count){return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(asset.blob),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='metadata';let frames=[],index=0,done=false;
    const close=(value,error)=>{if(done)return;done=true;URL.revokeObjectURL(url);video.removeAttribute('src');video.load();error?reject(error):resolve(value)};
    const snap=()=>{try{const w=video.videoWidth,h=video.videoHeight;if(!w||!h)throw new Error('Video sin dimensiones');const targetW=180,targetH=Math.max(70,Math.round(targetW*h/w)),canvas=document.createElement('canvas');canvas.width=targetW;canvas.height=targetH;canvas.getContext('2d').drawImage(video,0,0,targetW,targetH);frames.push(canvas.toDataURL('image/jpeg',.58));index++;seek()}catch(e){close(frames.length?frames:null,e)}};
    const seek=()=>{if(index>=count)return close(frames);const duration=Number.isFinite(video.duration)?video.duration:0;if(duration<=.12)return index?snap():close(asset.thumbnail?[asset.thumbnail]:[]);const t=Math.min(Math.max(.04,duration*((index+.5)/count)),Math.max(.04,duration-.05));video.onseeked=snap;try{video.currentTime=t}catch(e){close(frames.length?frames:null,e)}};
    video.onloadedmetadata=seek;video.onerror=()=>close(null,new Error('No se pudo leer el video'));video.src=url;
  })}
  async decorate(project,assets,root=document){
    const clips=[...root.querySelectorAll('.clip[data-id]')];
    await Promise.all(clips.map(async el=>{
      const clip=(project?.clips||[]).find(c=>this.sameId(c.id,el.dataset.id));if(!clip||![0,1].includes(Number(clip.track))||clip.asset===null||clip.asset===undefined)return;
      const asset=(assets||[]).find(a=>this.sameId(a.id,clip.asset));if(!asset||!['video','image'].includes(asset.type))return;
      let strip=el.querySelector('.filmstrip');if(!strip){strip=document.createElement('span');strip.className='filmstrip';el.prepend(strip)}
      if(asset.type==='image'){
        strip.replaceChildren();strip.classList.add('single');strip.style.backgroundImage=asset.thumbnail?`url("${asset.thumbnail}")`:'';return;
      }
      strip.style.backgroundImage='';
      const count=Math.max(2,Math.min(this.maxFrames,Math.ceil(Math.max(1,el.clientWidth)/70))),frames=await this.frames(asset,count);if(!el.isConnected||!frames.length)return;
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
      const observer=new MutationObserver(schedule);observer.observe(tracks,{childList:true,subtree:true});tracks.__filmstripObserver=observer;
    }
    schedule();return true;
  };
  if(!install())window.addEventListener('DOMContentLoaded',install,{once:true});
})();