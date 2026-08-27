(()=>{
  const mediaCache=new Map();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,p)=>a+(b-a)*p;
  function assetById(id){return assets.find(a=>a.id===id)}
  function cachedMedia(a){
    if(mediaCache.has(a.id))return mediaCache.get(a.id);
    const url=URL.createObjectURL(a.blob); let entry={url,type:a.type,ready:null,el:null};
    if(a.type==='image'){
      const im=new Image(); entry.el=im; entry.ready=new Promise((resolve,reject)=>{im.onload=()=>resolve(im);im.onerror=reject;im.src=url});
    }else if(a.type==='video'){
      const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=url;entry.el=v;
      entry.ready=new Promise((resolve,reject)=>{if(v.readyState>=1)resolve(v);else{v.onloadedmetadata=()=>resolve(v);v.onerror=reject;v.load()}});
    }
    mediaCache.set(a.id,entry);return entry;
  }
  async function seekVideo(v,time){
    await new Promise(resolve=>{
      const target=clamp(time,0,Math.max(0,(Number.isFinite(v.duration)?v.duration:time)-.01));
      if(v.readyState>=2&&Math.abs(v.currentTime-target)<.035){resolve();return}
      let done=false;const finish=()=>{if(done)return;done=true;v.removeEventListener('seeked',finish);resolve()};
      v.addEventListener('seeked',finish,{once:true});try{v.currentTime=target}catch{finish()}setTimeout(finish,220);
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
    const local=clamp(t-Number(c.start||0),0,Number(c.duration||0)),duration=Math.max(.05,Number(c.duration)||.05),transition=c.transition||'cut',motion=c.motion||'none',td=Math.min(.28,Math.max(.08,duration*.12)),p=clamp(local/duration,0,1),kf=keyframed(c,p);
    const rawX=kf? kf.positionX : Number(c.positionX||0),rawY=kf? kf.positionY : Number(c.positionY||0),rawScale=kf? kf.scale : Number(c.scale||1),rawRot=kf? kf.rotation : Number(c.rotation||0),rawOpacity=kf? kf.opacity : Number(c.opacity??1);
    let alpha=clamp(rawOpacity,0,1),x=canvas.width*clamp(rawX,-100,100)/100,y=canvas.height*clamp(rawY,-100,100)/100,scale=clamp(rawScale,.25,3),rotation=clamp(rawRot,-180,180)*Math.PI/180;
    if(transition==='fade'&&c.start>0)alpha*=clamp(local/td,0,1);
    if(transition==='slide'&&c.start>0)x+=canvas.width*(1-clamp(local/td,0,1));
    if(transition==='zoom'&&c.start>0)scale*=1+.025*(1-clamp(local/td,0,1));
    if(motion==='slow-zoom')scale*=1+.065*p;if(motion==='push-in')scale*=1+.10*p;
    return {alpha,x,y,scale,rotation};
  }
  async function drawClip(c,t){
    const a=assetById(c.asset);if(!a||!['image','video'].includes(a.type))return;
    let entry;try{entry=cachedMedia(a);await entry.ready}catch{return}const source=entry.el;
    if(a.type==='video'){const speed=clamp(Number(c.speed)||1,.25,4),sourceTime=Math.max(0,(Number(c.sourceOffset)||0)+(t-Number(c.start||0))*speed);await seekVideo(source,sourceTime)}
    const fit=['cover','contain'].includes(c.fitMode)?c.fitMode:'cover',size=fitted(source,fit);if(!size)return;const tr=transformFor(c,t),flipX=c.flipX?-1:1,flipY=c.flipY?-1:1;
    ctx.save();ctx.globalAlpha=tr.alpha;ctx.translate(canvas.width/2+tr.x,canvas.height/2+tr.y);ctx.rotate(tr.rotation);ctx.scale(tr.scale*flipX,tr.scale*flipY);ctx.drawImage(source,-size.w/2,-size.h/2,size.w,size.h);ctx.restore();
  }
  function drawCaption(t){
    const cap=project.clips.find(c=>c.track===3&&t>=Number(c.start||0)&&t<Number(c.start||0)+Number(c.duration||0));if(!cap)return;
    const words=Array.isArray(cap.wordTimings)?cap.wordTimings:[];if(words.some(w=>t>=Number(w.start)&&t<Number(w.end)))return;
    const hook=cap.style==='hook-pop',start=Number(cap.start||0),anim=cap.animation||'';let y=canvas.height*(hook?.69:.72),size=hook?38:30;
    if(anim==='pop')y-=9*Math.exp(-10*Math.max(0,t-start))*Math.cos(28*Math.max(0,t-start));if(anim==='word-pulse')y-=3*Math.sin(8*Math.max(0,t-start));
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${size}px Arial`;const text=String(cap.name||'');const m=ctx.measureText(text),pad=18;ctx.fillStyle=hook?'rgba(0,0,0,.48)':'rgba(0,0,0,.42)';ctx.fillRect(canvas.width/2-m.width/2-pad,y-size,m.width+pad*2,size*2);ctx.lineWidth=6;ctx.strokeStyle='rgba(0,0,0,.92)';ctx.strokeText(text,canvas.width/2,y);ctx.fillStyle=hook?'#FFE66D':'#fff';ctx.fillText(text,canvas.width/2,y);ctx.restore();
  }
  renderAt=async function(t){
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#090b10';ctx.fillRect(0,0,canvas.width,canvas.height);
    const active=project.clips.filter(c=>[0,1].includes(Number(c.track))&&c.asset&&t>=Number(c.start||0)&&t<Number(c.start||0)+Number(c.duration||0)).sort((a,b)=>Number(a.track)-Number(b.track));
    if(!active.length){$('#placeholder').hidden=false;ctx.fillStyle='#fff';ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.fillText(project.mode==='Automático'?'Modo automático listo':'Editor manual listo',canvas.width/2,canvas.height/2)}else{$('#placeholder').hidden=true;for(const c of active)await drawClip(c,t)}
    drawCaption(t);
  };
  window.ProfitMentePreviewEngine={clearCache(){for(const e of mediaCache.values())URL.revokeObjectURL(e.url);mediaCache.clear()},cacheSize(){return mediaCache.size}};
})();