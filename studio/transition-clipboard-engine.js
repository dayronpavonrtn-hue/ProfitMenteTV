(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteTransitionClipboardEngine=api.ProfitMenteTransitionClipboardEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SUPPORTED=new Set(['cut','fade','slide','zoom']);
  const numeric=value=>{const n=Number(value);return Number.isFinite(n)?n:null};
  const canonicalTrack=value=>{if(value===null||value===undefined||typeof value==='boolean')return null;const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=6?n:null};
  const visual=clip=>[0,1].includes(canonicalTrack(clip?.track));
  const sameId=(a,b)=>String(a??'')!==''&&String(a)===String(b);
  const stateEntries=(project,track)=>{const out=[];for(const map of [project?.trackState,project?.trackStates]){if(!map||typeof map!=='object')continue;for(const [key,value] of Object.entries(map))if(canonicalTrack(key)===track&&value&&typeof value==='object')out.push(value)}return out};
  const locked=(project,clip)=>clip?.locked===true||stateEntries(project,canonicalTrack(clip?.track)).some(state=>state.locked===true);
  class ProfitMenteTransitionClipboardEngine{
    static copy(project,selectedId){
      const clip=(project?.clips||[]).find(c=>visual(c)&&sameId(c?.id,selectedId));
      if(!clip)return {ok:false,reason:'no-selection'};
      const type=SUPPORTED.has(String(clip.transition||'cut'))?String(clip.transition||'cut'):'cut';
      const data={type};
      if(type!=='cut'){
        const duration=numeric(clip.transitionDuration);if(duration!==null&&duration>0)data.duration=duration;
        data.durationAuto=clip.transitionDurationAuto===true;
        data.autoTransition=clip.autoTransition===true;
      }
      return {ok:true,reason:'ok',data};
    }
    static paste(project,selectedId,data){
      const clip=(project?.clips||[]).find(c=>visual(c)&&sameId(c?.id,selectedId));
      if(!clip)return {changed:0,reason:'no-selection'};
      if(locked(project,clip))return {changed:0,reason:'locked'};
      if(!data||!SUPPORTED.has(String(data.type||'')))return {changed:0,reason:'invalid-clipboard'};
      const type=String(data.type),before=JSON.stringify([clip.transition,clip.transitionDuration,clip.transitionDurationAuto,clip.autoTransition]);
      clip.transition=type;
      if(type==='cut'){
        delete clip.transitionDuration;delete clip.transitionDurationAuto;clip.autoTransition=false;
      }else{
        const duration=numeric(data.duration);
        if(duration!==null&&duration>0)clip.transitionDuration=Math.max(.05,Math.min(2,Math.min(Math.max(.05,Number(clip.duration)||.05),duration)));
        else delete clip.transitionDuration;
        clip.transitionDurationAuto=data.durationAuto===true;
        clip.autoTransition=data.autoTransition===true;
      }
      const after=JSON.stringify([clip.transition,clip.transitionDuration,clip.transitionDurationAuto,clip.autoTransition]);
      return {changed:before===after?0:1,reason:'ok',type};
    }
  }
  ProfitMenteTransitionClipboardEngine.SUPPORTED=[...SUPPORTED];
  return {ProfitMenteTransitionClipboardEngine};
});
