class ProfitMenteMediaInspector{
  constructor(){this.version=1}
  async inspect(asset){
    if(!asset?.blob) return asset;
    if(asset.metadataVersion===this.version) return asset;
    const base={...asset,size:asset.blob.size||0,metadataVersion:this.version};
    try{
      if(asset.type==='image') return {...base,...await this.inspectImage(asset.blob)};
      if(asset.type==='video') return {...base,...await this.inspectVideo(asset.blob)};
      if(asset.type==='audio') return {...base,...await this.inspectAudio(asset.blob)};
    }catch(e){console.warn('No se pudo inspeccionar',asset.name,e)}
    return base;
  }
  inspectImage(blob){return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{try{resolve({width:img.naturalWidth,height:img.naturalHeight,duration:5,thumbnail:this.thumb(img,img.naturalWidth,img.naturalHeight)})}finally{URL.revokeObjectURL(url)}};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Imagen inválida'))};img.src=url;
  })}
  inspectAudio(blob){return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),el=document.createElement('audio');el.preload='metadata';
    el.onloadedmetadata=()=>{const duration=Number.isFinite(el.duration)?el.duration:0;URL.revokeObjectURL(url);resolve({duration})};
    el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Audio inválido'))};el.src=url;
  })}
  inspectVideo(blob){return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),el=document.createElement('video');el.preload='metadata';el.muted=true;el.playsInline=true;
    let done=false;const finish=meta=>{if(done)return;done=true;URL.revokeObjectURL(url);resolve(meta)};
    el.onloadedmetadata=()=>{const duration=Number.isFinite(el.duration)?el.duration:0,width=el.videoWidth,height=el.videoHeight,target=Math.min(Math.max(.05,duration*.08),Math.max(.05,duration-.05));
      const capture=()=>{let thumbnail=null;try{thumbnail=this.thumb(el,width,height)}catch{}finish({duration,width,height,thumbnail})};
      if(duration>.1){el.onseeked=capture;try{el.currentTime=target}catch{capture()}}else capture();
    };
    el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Video inválido'))};el.src=url;
  })}
  thumb(source,width,height){
    if(!width||!height)return null;const max=240,scale=Math.min(1,max/Math.max(width,height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(width*scale));c.height=Math.max(1,Math.round(height*scale));c.getContext('2d').drawImage(source,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.68)
  }
  label(asset){
    const bits=[];if(asset.width&&asset.height)bits.push(`${asset.width}×${asset.height}`);if(asset.duration)bits.push(this.time(asset.duration));if(asset.size)bits.push(this.bytes(asset.size));return bits.join(' · ')
  }
  time(sec){sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
  bytes(n){if(n<1048576)return `${Math.max(1,Math.round(n/1024))} KB`;return `${(n/1048576).toFixed(1)} MB`}
}
window.ProfitMenteMediaInspector=ProfitMenteMediaInspector;

(function integrateMediaInspector(){
  const inspector=new ProfitMenteMediaInspector(),basePut=putAsset;
  putAsset=async function(asset){const enriched=await inspector.inspect(asset);Object.assign(asset,enriched);return basePut(asset)};
  drawLibrary=function(){
    const el=document.querySelector('#mediaLibrary');el.innerHTML='';
    if(!assets.length){el.textContent='Sin archivos';return}
    for(const a of assets){
      const card=document.createElement('button');card.className='mediaCard';
      const icon=a.type==='video'?'🎬':a.type==='image'?'🖼':'🎵';
      card.innerHTML=`${a.thumbnail?`<img src="${a.thumbnail}" alt="">`:`<span class="mediaIcon">${icon}</span>`}<span class="mediaInfo"><b>${escapeHtml(a.name)}</b><small>${inspector.label(a)||a.mime||a.type}</small></span>`;
      card.title=`Añadir ${a.name} al cursor`;
      card.onclick=()=>{const start=+document.querySelector('#playhead').value||0,remaining=Math.max(.25,project.duration-start),native=a.type==='image'?5:(a.duration||8),duration=Math.min(native,remaining);addClip(a.type==='audio'?5:0,a.name,a.id,start,duration)};
      el.appendChild(card)
    }
  };
  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  async function upgradeExisting(){
    let changed=0;
    for(let i=0;i<assets.length;i++)if(assets[i]?.blob&&assets[i].metadataVersion!==inspector.version){const next=await inspector.inspect(assets[i]);assets[i]=next;await basePut(next);changed++}
    if(changed){drawLibrary();setStatus(`${changed} medios analizados · duración, resolución y miniaturas listas`)}
  }
  setTimeout(upgradeExisting,50);
  window.profitMenteMediaInspector=inspector;
})();