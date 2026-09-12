(()=>{
  const baseRender=renderAt;
  let captionRenderEpoch=0;
  const strictFlag=value=>value===true;
  function canonicalTrack(value){
    if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol'||typeof value==='object')return null;
    const raw=String(value).trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
    const parsed=Number(raw);return Number.isInteger(parsed)&&parsed>=0?Object.is(parsed,-0)?0:parsed:null;
  }
  function trackStateValue(map,track){
    if(!map||typeof map!=='object')return null;
    const aliases=Object.entries(map).filter(([key,value])=>canonicalTrack(key)===track&&value&&typeof value==='object');
    if(!aliases.length)return null;
    const merged={};
    for(const [key,value] of aliases)if(key!==String(track))Object.assign(merged,value);
    for(const [key,value] of aliases)if(key===String(track))Object.assign(merged,value);
    if(aliases.some(([,value])=>strictFlag(value.hidden)))merged.hidden=true;
    else if('hidden' in merged&&!strictFlag(merged.hidden))merged.hidden=false;
    return merged;
  }
  function captionsHidden(){
    const current=trackStateValue(project?.trackState,3),legacy=trackStateValue(project?.trackStates,3);
    return strictFlag(current?.hidden)||strictFlag(legacy?.hidden);
  }
  function finiteNumber(value){
    if(typeof value==='boolean'||value===null||value===undefined)return null;
    if(typeof value!=='number'&&typeof value!=='string')return null;
    if(typeof value==='string'&&!value.trim())return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }
  function activeCaptionFallback(t){
    const time=finiteNumber(t);if(time===null)return[];
    return project.clips.filter(c=>{
      if(canonicalTrack(c?.track)!==3)return false;
      const start=finiteNumber(c?.start),duration=finiteNumber(c?.duration);
      return start!==null&&duration!==null&&duration>0&&time>=start&&time<start+duration;
    });
  }
  function normalizeWordTimings(clip){
    if(!clip||typeof clip!=='object'||!Array.isArray(clip.wordTimings))return[];
    const clipStart=finiteNumber(clip.start),clipDuration=finiteNumber(clip.duration);
    if(clipStart===null||clipDuration===null||clipDuration<=0)return[];
    const clipEnd=clipStart+clipDuration;
    const rawMode=typeof clip.wordTimingMode==='string'?clip.wordTimingMode.trim().toLowerCase():'';
    const mode=rawMode==='relative'||rawMode==='absolute'?rawMode:'';
    const normalized=[];
    for(const timing of clip.wordTimings){
      if(!timing||typeof timing!=='object'||Array.isArray(timing))continue;
      const rawWord=typeof timing.word==='string'?timing.word:(typeof timing.text==='string'?timing.text:'');
      const word=rawWord.trim();
      if(!word)continue;
      let start=finiteNumber(timing.start),end=finiteNumber(timing.end);
      const duration=finiteNumber(timing.duration);
      if(start===null)continue;
      if(end===null&&duration!==null&&duration>0)end=start+duration;
      if(end===null||end<=start)continue;
      let relative=mode==='relative'||timing.relative===true;
      if(!mode&&!relative){
        relative=clipStart>1e-6&&start>=-1e-6&&end<=clipDuration+1e-6&&start<clipStart-1e-6;
      }
      if(relative){start+=clipStart;end+=clipStart}
      start=Math.max(clipStart,start);end=Math.min(clipEnd,end);
      if(end-start<=1e-6)continue;
      normalized.push({word,start,end,duration:end-start});
    }
    normalized.sort((a,b)=>a.start-b.start||a.end-b.end||a.word.localeCompare(b.word));
    return normalized;
  }
  function fitWordFont(ctx,text,baseSize,maxWidth,minSize=22){
    const safeBase=Math.max(minSize,Number(baseSize)||minSize),safeWidth=Math.max(1,Number(maxWidth)||1);
    ctx.font=`900 ${Math.round(safeBase)}px Arial`;
    const measured=Math.max(1,ctx.measureText(String(text||'')).width||1);
    if(measured<=safeWidth)return safeBase;
    return Math.max(minSize,safeBase*(safeWidth/measured));
  }
  function wordPopScale(value){
    const raw=finiteNumber(value),progress=Math.max(0,Math.min(1,raw===null?1:raw));
    if(progress<=0||progress>=1)return 1;
    return 1+0.16*Math.exp(-7*progress)*Math.sin(Math.PI*progress*2);
  }
  function drawWord(word,t){
    const progress=Math.max(0,Math.min(1,(t-word.start)/Math.max(.01,word.duration||Number(word.end)-Number(word.start))));
    const pop=wordPopScale(progress);
    ctx.save();
    ctx.textAlign='center';ctx.textBaseline='middle';
    const text=String(word.word).toUpperCase(),pad=24,maxTextWidth=canvas.width*.88-pad*2;
    const fontSize=fitWordFont(ctx,text,46*pop,maxTextWidth,22);
    ctx.font=`900 ${Math.round(fontSize)}px Arial`;
    const metrics=ctx.measureText(text),x=canvas.width/2,y=canvas.height*.73,w=Math.min(canvas.width*.88,metrics.width+pad*2),h=Math.max(48,fontSize*1.56);
    ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(x-w/2,y-h/2,w,h);
    ctx.lineWidth=Math.max(4,Math.min(8,fontSize*.17));ctx.strokeStyle='rgba(0,0,0,.96)';ctx.strokeText(text,x,y);
    ctx.fillStyle='#FFE66D';ctx.fillText(text,x,y);ctx.restore();
  }
  renderAt=async function(t){
    const epoch=++captionRenderEpoch;
    await baseRender(t);
    // baseRender can wait for image decode/video seek. A newer playhead request may
    // already have painted the correct frame while this older request is still
    // pending. Never let an obsolete word overlay land on top of that newer frame.
    if(epoch!==captionRenderEpoch)return;
    if(captionsHidden())return;
    const active=window.ProfitMentePreviewEngine?.activeCaptions?.(t)||activeCaptionFallback(t);
    for(const cap of active){
      if(epoch!==captionRenderEpoch)return;
      const word=normalizeWordTimings(cap).find(w=>t>=w.start&&t<w.end);
      if(word)drawWord(word,t);
    }
  };
  window.ProfitMenteCaptionPreview={captionsHidden,canonicalTrack,finiteNumber,activeCaptionFallback,normalizeWordTimings,fitWordFont,wordPopScale,drawWord,get renderEpoch(){return captionRenderEpoch}};
})();