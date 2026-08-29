(()=>{
  if(typeof document==='undefined'||window.ProfitMenteAudioWaveforms||!window.ProfitMenteAudioWaveformEngine)return;
  const Engine=window.ProfitMenteAudioWaveformEngine,cache=new Map();let context=null,renderToken=0;
  const style=document.createElement('style');style.id='profitmenteAudioWaveformStyle';style.textContent=`
    .clip{overflow:hidden}.profitmente-waveform{position:absolute;inset:15px 3px 3px;z-index:0;width:calc(100% - 6px);height:calc(100% - 18px);opacity:.72;pointer-events:none}.clip[data-waveform-ready="1"]{isolation:isolate}.clip[data-waveform-ready="1"]::after{content:'';position:absolute;inset:0;pointer-events:none;border:1px solid rgba(255,255,255,.05)}
  `;document.head.appendChild(style);
  function audioContext(){if(context)return context;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;context=new C();return context}
  function assetKey(asset){return [asset?.id,asset?.sourceContentHash,asset?.sourceFingerprint,asset?.blob?.size,asset?.blob?.type].filter(Boolean).join('|')}
  async function decode(asset){
    if(!asset?.blob)return null;const key=assetKey(asset);if(cache.has(key))return cache.get(key);
    const promise=(async()=>{const ac=audioContext();if(!ac)return null;try{const raw=await asset.blob.arrayBuffer(),buffer=await ac.decodeAudioData(raw.slice(0));return {duration:buffer.duration,peaks:Engine.buildPeaks(buffer,1024)}}catch(err){console.warn('Waveform no disponible para',asset.name,err);return null}})();
    cache.set(key,promise);return promise;
  }
  function draw(canvas,peaks){
    const rect=canvas.getBoundingClientRect(),dpr=Math.max(1,window.devicePixelRatio||1),w=Math.max(24,Math.floor(rect.width*dpr)),h=Math.max(12,Math.floor(rect.height*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
    const g=canvas.getContext('2d');g.clearRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.78)';const mid=h/2,bar=Math.max(1,w/Math.max(1,peaks.length));
    peaks.forEach((p,i)=>{const amp=Math.max(1,p*(h*.48)),x=Math.floor(i*bar);g.fillRect(x,mid-amp,Math.max(1,Math.ceil(bar*.68)),amp*2)});
  }
  async function render(){
    const token=++renderToken;if(typeof project==='undefined'||typeof assets==='undefined')return;
    const clips=Array.from(document.querySelectorAll('.clip[data-id]'));
    for(const el of clips){
      if(token!==renderToken)return;const clip=project.clips?.find(c=>c.id===el.dataset.id);if(!clip||![4,5,6].includes(Number(clip.track))||!clip.asset)continue;
      const asset=assets.find(a=>a.id===clip.asset);if(!asset||!['audio','video'].includes(asset.type))continue;
      const decoded=await decode(asset);if(!decoded||token!==renderToken)continue;
      let canvas=el.querySelector('.profitmente-waveform');if(!canvas){canvas=document.createElement('canvas');canvas.className='profitmente-waveform';canvas.setAttribute('aria-hidden','true');el.appendChild(canvas)}
      const visible=Engine.slicePeaks(decoded.peaks,{sourceOffset:Number(clip.sourceOffset)||0,clipDuration:Number(clip.duration)||0,speed:Number(clip.speed)||1,sourceDuration:decoded.duration,bins:Math.max(24,Math.min(240,Math.round(el.getBoundingClientRect().width/2)))});
      draw(canvas,Engine.drawable(visible));el.dataset.waveformReady='1';el.title=`${clip.name} · waveform local · ${decoded.duration.toFixed(1)}s`;
    }
  }
  const originalDraw=typeof drawTimeline==='function'?drawTimeline:null;
  if(originalDraw){drawTimeline=function(){const result=originalDraw.apply(this,arguments);queueMicrotask(render);return result}}
  ['profitmente:media-imported','profitmente:media-relinked','profitmente:project-loaded','profitmente:features-ready'].forEach(name=>document.addEventListener(name,()=>queueMicrotask(render)));
  window.addEventListener('resize',()=>queueMicrotask(render));
  const api={render,clearCache(assetId=null){if(!assetId)cache.clear();else for(const key of cache.keys())if(key.startsWith(assetId+'|')||key===assetId)cache.delete(key);queueMicrotask(render)},cache};window.ProfitMenteAudioWaveforms=api;
  queueMicrotask(render);
})();
