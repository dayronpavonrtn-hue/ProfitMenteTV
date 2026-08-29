(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteSafeAreaEngine=api.ProfitMenteSafeAreaEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteSafeAreaEngine{
  constructor(){this.profiles={generic:{top:.08,right:.06,bottom:.12,left:.06},tiktok:{top:.07,right:.18,bottom:.19,left:.05},reels:{top:.08,right:.15,bottom:.17,left:.05},shorts:{top:.07,right:.17,bottom:.16,left:.05}}}
  profile(platform='generic',format='9:16'){
    if(format!=='9:16')return {top:.05,right:.05,bottom:.08,left:.05};
    return {...(this.profiles[platform]||this.profiles.generic)}
  }
  rect(platform='generic',format='9:16'){
    const p=this.profile(platform,format);return {x:p.left,y:p.top,width:Math.max(0,1-p.left-p.right),height:Math.max(0,1-p.top-p.bottom),right:1-p.right,bottom:1-p.bottom}
  }
  pointForClip(clip){
    const x=.5+(Math.max(-100,Math.min(100,Number(clip?.textX)||0))/100);
    const y=.5+(Math.max(-100,Math.min(100,Number(clip?.textY)||0))/100);
    return {x,y}
  }
  inspect(project,platform='generic'){
    const rect=this.rect(platform,project?.format||'9:16'),warnings=[];
    for(const clip of project?.clips||[]){
      if(Number(clip.track)!==2||!String(clip.name||'').trim())continue;
      const p=this.pointForClip(clip);
      if(p.x<rect.x||p.x>rect.right||p.y<rect.y||p.y>rect.bottom)warnings.push({clipId:clip.id,name:clip.name,reason:'outside-safe-area',x:p.x,y:p.y});
    }
    return {ok:warnings.length===0,platform,format:project?.format||'9:16',rect,warnings}
  }
  clampClip(clip,platform='generic',format='9:16'){
    if(Number(clip?.track)!==2||!String(clip?.name||'').trim())return {changed:false,clip};
    const rect=this.rect(platform,format),p=this.pointForClip(clip);
    const x=Math.max(rect.x,Math.min(rect.right,p.x)),y=Math.max(rect.y,Math.min(rect.bottom,p.y));
    const textX=Math.max(-45,Math.min(45,(x-.5)*100)),textY=Math.max(-45,Math.min(45,(y-.5)*100));
    const oldX=Number(clip.textX)||0,oldY=Number(clip.textY)||0,changed=Math.abs(oldX-textX)>.0001||Math.abs(oldY-textY)>.0001;
    if(changed){clip.textX=+textX.toFixed(2);clip.textY=+textY.toFixed(2)}
    return {changed,clip,from:{textX:oldX,textY:oldY},to:{textX:clip.textX??oldX,textY:clip.textY??oldY}}
  }
  clampProject(project,platform='generic'){
    const changes=[];
    for(const clip of project?.clips||[]){const result=this.clampClip(clip,platform,project?.format||'9:16');if(result.changed)changes.push({clipId:clip.id,name:clip.name,from:result.from,to:result.to})}
    return {changed:changes.length>0,count:changes.length,changes,inspection:this.inspect(project,platform)}
  }
}
return {ProfitMenteSafeAreaEngine};
});