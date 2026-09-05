(()=>{
  const mediaCache=new Map();
  let renderEpoch=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,p)=>a+(b-a)*p;
  const mediaIdKey=value=>{
    if(value===undefined||value===null)return null;
    const raw=String(value).trim();
    if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){
      const numeric=Number(raw);
      if(Number.isFinite(numeric))return `n:${numeric}`;
    }
    return `s:${raw}`;
  };
  function assetById(id){const key=mediaIdKey(id);return key===null?undefined:assets.find(a=>mediaIdKey(a?.id)===key)}
  function canonicalTrack(value){const parsed=Number(value);return Number.isFinite(parsed)&&Number.isInteger(parsed)?parsed:value}
  function trackStateValue(map,track){
    if(!map||typeof map!=='object')return null;
    const aliases=Object.entries(map).filter(([key,value])=>canonicalTrack(key)===track&&value&&typeof value==='object');
    if(!aliases.length)return null;
    const merged={};
    for(const [key,value] of aliases)if(key!==String(track))Object.assign(merged,value);
    for(const [key,value] of aliases)if(key===String(track))Object.assign(merged,value);
    if(aliases.some(([,value])=>!!value.hidden))merged.hidden=true;
    return merged;
  }
  function trackHidden(track){
    const current=trackStateValue(project?.trackState,track),legacy=trackStateValue(project?.trackStates,track);
    return !!(current?.hidden||legacy?.hidden);
  }
  function transitionDuration(c,duration){const fallback=Math.min(.28,Math.max(.08,duration*.12)),raw=Number(c?.transitionDuration);return clamp(Number.isFinite(raw)?raw:fallback,.05,Math.min(2,Math.max(.05,duration)))}
  function previewBlobFor(a){return a?.type==='video'&&a.previewBlob instanceof Blob&&a.previewBlob.size?a.previewBlob:a?.blob}
  function cachedMedia(a){
    const blob=previewBlobFor(a),cacheKey=mediaIdKey(a?.id)??a?.id,cached=mediaCache.get(cacheKey);
    if(cached&&cached.blob===blob)return cached;
    if(cached){try{URL.revokeObjectURL(cached.url)}catch{}mediaCache.delete(cacheKey)}
    const url=URL.createObjectURL(blob); let entry={url,type:a.type,blob,usingProxy:blob!==a.blob,ready:null,el:null};
    if(a.type==='image'){
      const im=new Image(); entry.el=im; entry.ready=new Promise((resolve,reject)=>{im.onload=()=>resolve(im);im.onerror=reject;im.src=url});
    }else if(a.type==='video'){
      const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=url;entry.el=v;
      entry.ready=new Promise((resolve,reject)=>{if(v.readyState>=1)resolve(v);else{v.onloadedmetadata=()=>resolve(v);v.onerror=reject;v.load()}});
    }
    mediaCache.set(cacheKey,entry);return entry;
  }
  async function seekVideo(v,time){
    return new Promise(resolve=>{
      const target=clamp(time,0,Math.max(0,(Number.isFinite(v.duration)?v.duration:time)-.01));
      let settled=false,seekTimer=null,frameTimer=null;
      const cleanup=()=>{v.removeEventListener('seeked',onSeeked);if(seekTimer)clearTimeout(seekTimer);if(frameTimer)clearTimeout(frameTimer)};
      const finish=ok=>{if(settled)return;settled=true;cleanup();resolve(!!ok)};
      const afterSeek=()=>{
        if(v.readyState<2){finish(false);return}
        if(typeof v.requestVideoFrameCallback==='function'){
          try{v.requestVideoFrameCallback(()=>finish(true));frameTimer=setTimeout(()=>finish(v.readyState>=2),160)}catch{finish(v.readyState>=2)}
        }else finish(true);
      };
      const onSeeked=()=>afterSeek();
      if(v.readyState>=2&&Math.abs(v.currentTime-target)<.035){afterSeek();return}
      v.addEventListener('seeked',onSeeked,{once:true});
      try{v.currentTime=target}catch{finish(false);return}
      seekTimer=setTimeout(()=>finish(false),750);
    });
  }
  function fitted(source,mode='cover'){
    const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;if(!sw||!sh)return null;
    const contain=mode==='contain',s=(contain?Math.min:Math.max)(canvas.width/sw,canvas.height/sh);return {w:sw*s,h:sh*s};
  }
  function keyframed(c,p){
    const k=c.keyframes;if(!k?.start||!k?.end)return null;
    const num=(obj,key,fallback)=>Number.isFinite(Number(obj?.[key]))?Number(obj[key]):fallback;
    return {
      positionX:lerp(num(k.start,'positionX',Number(c.positionX||0)),num(k.end,'positionX',Number(c.positionX||0)),p),
      positionY:lerp(num(k.start,'positionY',Number(c.positionY||0)),num(k.end,'positionY',Number(c.positionY||0)),p),
      scale:lerp(num(k.start,'scale',Number(c.scale||1)),num(k.end,'scale',Number(c.scale||1)),p),
      rotation:lerp(num(k.start,'rotation',Number(c.rotation||0)),num(k.end,'rotation',Number(c.rotation||0)),p),
      opacity:lerp(num(k.start,'opacity',Number(c.opacity??1)),num(k.end,'opacity',Number(c.opacity??1)),p)
    };
  }
  function transformFor(c,t){
    const local=clamp(t-Number(c.start||0),0,Number(c.duration||0)),duration=Math.max(.05,Number(c.duration)||.05),transition=c.transition||'cut',motion=c.motion||'none',td=transitionDuration(c,duration),p=clamp(local/duration,0,1),kf=keyframed(c,p);
    const rawX=kf? kf.positionX : Number(c.positionX||0),rawY=kf? kf.positionY : Number(c.positionY||0),rawScale=kf? kf.scale : Number(c.scale||1),rawRot=kf? kf.rotation : Number(c.rotation||0),rawOpacity=kf? kf.opacity : Number(c.opacity??1);
    let alpha=clamp(rawOpacity,0,1),x=canvas.width*clamp(rawX,-100,100)/100,y=canvas.height*clamp(rawY,-100,100)/100,scale=clamp(rawScale,.25,3),rotation=clamp(rawRot,-180,180)*Math.PI/180;
    if(['fade','slide','zoom'].includes(transition)&&c.start>0)alpha*=clamp(local/td,0,1);
    if(transition==='slide'&&c.start>0)x+=canvas.width*(1-clamp(local/td,0,1));
    if(transition==='zoom'&&c.start>0)scale*=1+.025*(1-clamp(local/td,0,1));
    if(!kf){if(motion==='slow-zoom')scale*=1+.065*p;if(motion==='push-in')scale*=1+.10*p}
    return {alpha,x,y,scale,rotation};
  }
  async function drawClip(c,t,epoch){
    const a=assetById(c.asset);if(!a||!['image','video'].includes(a.type))return false;
    let entry;try{entry=cachedMedia(a);await entry.ready}catch{return false}
    if(epoch!==renderEpoch)return false;
    const source=entry.el;
    if(a.type==='video'){
      const speed=clamp(Number(c.speed)||1,.25,4),sourceTime=Math.max(0,(Number(c.sourceOffset)||0)+(t-Number(c.start||0))*speed);
      const frameReady=await seekVideo(source,sourceTime);
      if(!frameReady||epoch!==renderEpoch)return false;
    }
    const fit=['cover','contain'].includes(c.fitMode)?c.fitMode:'cover',size=fitted(source,fit);if(!size||epoch!==renderEpoch)return false;const tr=transformFor(c,t),flipX=c.flipX?-1:1,flipY=c.flipY?-1:1;
    ctx.save();ctx.globalAlpha=tr.alpha;ctx.filter=window.ProfitMenteColorGrade?.cssFilter(c)||'none';ctx.translate(canvas.width/2+tr.x,canvas.height/2+tr.y);ctx.rotate(tr.rotation);ctx.scale(tr.scale*flipX,tr.scale*flipY);ctx.drawImage(source,-size.w/2,-size.h/2,size.w,size.h);ctx.restore();
    return true;
  }
  function wrapCaptionWords(text,maxWidth,maxLines){
    const words=String(text||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
    const lines=[];let line='';
    for(const word of words){const candidate=line?`${line} ${word}`:word;if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word}else line=candidate}
    if(line)lines.push(line);if(lines.length>maxLines)return null;return lines;
  }
  function captionLayout(text,baseSize){
    const maxWidth=canvas.width*.88,maxLines=3,minSize=Math.max(18,Math.round(baseSize*.62));
    for(let size=baseSize;size>=minSize;size-=2){ctx.font=`900 ${size}px Arial`;const lines=wrapCaptionWords(text,maxWidth,maxLines);if(lines&&lines.every(line=>ctx.measureText(line).width<=maxWidth))return {size,lines,lineHeight:Math.round(size*1.16)}}
    ctx.font=`900 ${minSize}px Arial`;const hard=[];for(const word of String(text||'').trim().split(/\s+/).filter(Boolean)){if(ctx.measureText(word).width<=maxWidth){hard.push(word);continue}let part='';for(const ch of word){const candidate=part+ch;if(part&&ctx.measureText(candidate).width>maxWidth){hard.push(part);part=ch}else part=candidate}if(part)hard.push(part)}
    const lines=[];let line='';for(const word of hard){const candidate=line?`${line} ${word}`:word;if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);return {size:minSize,lines:lines.slice(0,maxLines),lineHeight:Math.round(minSize*1.16)};
  }
  function activeCaptions(t){return project.clips.filter(c=>Number(c.track)===3&&t>=Number(c.start||0)&&t<Number(c.start||0)+Number(c.duration||0))}
  function drawCaptionClip(cap,t){
    const words=Array.isArray(cap.wordTimings)?cap.wordTimings:[];if(words.some(w=>t>=Number(w.start)&&t<Number(w.end)))return;
    const hook=cap.style==='hook-pop',start=Number(cap.start||0),anim=cap.animation||'';let y=canvas.height*(hook?.69:.72),size=hook?38:30;
    if(anim==='pop')y-=9*Math.exp(-10*Math.max(0,t-start))*Math.cos(28*Math.max(0,t-start));if(anim==='word-pulse')y-=3*Math.sin(8*Math.max(0,t-start));
    const compact=window.ProfitMenteCaptionCompactEngine?new window.ProfitMenteCaptionCompactEngine():null,text=compact?compact.textAtTime(cap,t):String(cap.name||'');
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';const layout=captionLayout(text,size),padX=18,padY=Math.max(8,Math.round(layout.size*.24)),blockHeight=layout.lineHeight*layout.lines.length+padY*2,top=y-blockHeight/2;ctx.font=`900 ${layout.size}px Arial`;const maxLine=Math.max(0,...layout.lines.map(line=>ctx.measureText(line).width));ctx.fillStyle=hook?'rgba(0,0,0,.48)':'rgba(0,0,0,.42)';ctx.fillRect(canvas.width/2-maxLine/2-padX,top,maxLine+padX*2,blockHeight);ctx.lineWidth=Math.max(4,Math.round(layout.size*.2));ctx.strokeStyle='rgba(0,0,0,.92)';ctx.fillStyle=hook?'#FFE66D':'#fff';layout.lines.forEach((line,i)=>{const ly=top+padY+layout.lineHeight*(i+.5);ctx.strokeText(line,canvas.width/2,ly);ctx.fillText(line,canvas.width/2,ly)});ctx.restore();
  }
  function drawCaption(t){if(trackHidden(3))return;for(const cap of activeCaptions(t))drawCaptionClip(cap,t)}
  function drawPreviewFallback(hasActiveMedia){const placeholder=$('#placeholder');if(placeholder)placeholder.hidden=false;ctx.fillStyle='#fff';ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.fillText(hasActiveMedia?'Medio no disponible · reconecta o reemplaza el archivo':project.mode==='Automático'?'Modo automático listo':'Editor manual listo',canvas.width/2,canvas.height/2)}
  renderAt=async function(t){
    const epoch=++renderEpoch;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#090b10';ctx.fillRect(0,0,canvas.width,canvas.height);
    const active=project.clips.filter(c=>[0,1].includes(Number(c.track))&&!trackHidden(Number(c.track))&&mediaIdKey(c?.asset)!==null&&t>=Number(c.start||0)&&t<Number(c.start||0)+Number(c.duration||0)).sort((a,b)=>(Number(a.track)-Number(b.track))||(Number(a.start||0)-Number(b.start||0)));
    let painted=0;for(const c of active){if(await drawClip(c,t,epoch))painted++;if(epoch!==renderEpoch)return}if(epoch!==renderEpoch)return;
    if(!painted)drawPreviewFallback(active.length>0);else{const placeholder=$('#placeholder');if(placeholder)placeholder.hidden=true}drawCaption(t);
  };
  window.ProfitMentePreviewEngine={clearCache(){renderEpoch++;for(const e of mediaCache.values())URL.revokeObjectURL(e.url);mediaCache.clear()},cacheSize(){return mediaCache.size},previewBlobFor,mediaIdKey,assetById,isTrackHidden:trackHidden,transitionDuration,transformFor,captionLayout,activeCaptions,drawPreviewFallback,get renderEpoch(){return renderEpoch}};
})();