(()=>{
  const baseRender=renderAt;
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
  function captionsHidden(){
    const current=trackStateValue(project?.trackState,3),legacy=trackStateValue(project?.trackStates,3);
    return !!(current?.hidden||legacy?.hidden);
  }
  function fitWordFont(ctx,text,baseSize,maxWidth,minSize=22){
    const safeBase=Math.max(minSize,Number(baseSize)||minSize),safeWidth=Math.max(1,Number(maxWidth)||1);
    ctx.font=`900 ${Math.round(safeBase)}px Arial`;
    const measured=Math.max(1,ctx.measureText(String(text||'')).width||1);
    if(measured<=safeWidth)return safeBase;
    return Math.max(minSize,safeBase*(safeWidth/measured));
  }
  function drawWord(word,t){
    const progress=Math.max(0,Math.min(1,(t-word.start)/Math.max(.01,word.duration||Number(word.end)-Number(word.start))));
    const pop=1+0.16*Math.exp(-7*progress)*Math.sin(Math.PI*Math.min(1,progress*2));
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
    await baseRender(t);
    if(captionsHidden())return;
    const active=window.ProfitMentePreviewEngine?.activeCaptions?.(t)||project.clips.filter(c=>Number(c.track)===3&&t>=Number(c.start||0)&&t<Number(c.start||0)+Number(c.duration||0));
    for(const cap of active){
      if(!Array.isArray(cap.wordTimings))continue;
      const word=cap.wordTimings.find(w=>t>=Number(w.start)&&t<Number(w.end));
      if(word)drawWord(word,t);
    }
  };
  window.ProfitMenteCaptionPreview={captionsHidden,fitWordFont,drawWord};
})();