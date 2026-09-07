(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteManualTransitionEngine=api.ProfitMenteManualTransitionEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TYPES=new Set(['cut','fade','slide','zoom']);
  const SCOPES=new Set(['selected','track','all']);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const numeric=value=>{
    if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol'||typeof value==='object')return null;
    const raw=String(value).trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
    const n=Number(raw);return Number.isFinite(n)?(Object.is(n,-0)?0:n):null;
  };
  const canonicalTrack=value=>{const n=numeric(value);return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?n:null};
  const idKey=value=>{
    if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol'||typeof value==='object')return null;
    const raw=String(value).trim();if(!raw)return null;const n=numeric(value);return n===null?`s:${raw}`:`n:${n}`;
  };
  const sameId=(a,b)=>{const x=idKey(a),y=idKey(b);return x!==null&&x===y};
  const stateEntries=(project,track)=>{
    const out=[];for(const map of [project?.trackState,project?.trackStates]){
      if(!map||typeof map!=='object')continue;
      for(const [key,value] of Object.entries(map))if(canonicalTrack(key)===track&&value&&typeof value==='object')out.push(value);
    }return out;
  };
  const trackLocked=(project,track)=>stateEntries(project,track).some(state=>state.locked===true);
  const clipLocked=(project,clip)=>clip?.locked===true||trackLocked(project,canonicalTrack(clip?.track));
  const visual=clip=>[0,1].includes(canonicalTrack(clip?.track));
  const durationOf=clip=>{const d=numeric(clip?.duration);return d!==null&&d>0?d:.05};
  const automaticDuration=clip=>{const d=Math.max(.05,durationOf(clip));return clamp(Math.min(.28,Math.max(.08,d*.12)),.05,Math.min(2,d))};
  const explicitDuration=(value,clip)=>{const n=numeric(value);if(n===null||n<=0)return null;return clamp(n,.05,Math.min(2,Math.max(.05,durationOf(clip))))};
  class ProfitMenteManualTransitionEngine{
    static targetClips(project,{scope='selected',selectedId=null}={}){
      if(!SCOPES.has(scope))return {clips:[],reason:'invalid-scope'};
      const clips=(Array.isArray(project?.clips)?project.clips:[]).filter(visual);
      if(scope==='all')return {clips,reason:'ok'};
      const selected=clips.find(c=>sameId(c?.id,selectedId));if(!selected)return {clips:[],reason:'no-selection'};
      if(scope==='selected')return {clips:[selected],reason:'ok'};
      const track=canonicalTrack(selected.track);return {clips:clips.filter(c=>canonicalTrack(c.track)===track),reason:'ok'};
    }
    static inspect(project,options={}){
      const pick=this.targetClips(project,options),clips=pick.clips||[],locked=clips.filter(c=>clipLocked(project,c)).length;
      return {scope:options.scope||'selected',targets:clips.length,editable:clips.length-locked,locked,reason:pick.reason};
    }
    static apply(project,{scope='selected',selectedId=null,type='fade',duration='auto'}={}){
      if(!TYPES.has(type))return {changed:0,locked:0,targets:0,reason:'invalid-type'};
      const pick=this.targetClips(project,{scope,selectedId});if(pick.reason!=='ok')return {changed:0,locked:0,targets:0,reason:pick.reason};
      let changed=0,locked=0,skipped=0;
      for(const clip of pick.clips){
        if(clipLocked(project,clip)){locked++;continue}
        if(type==='cut'){
          const before=clip.transition!=='cut'||clip.transitionDuration!==undefined||clip.transitionDurationAuto!==undefined||clip.autoTransition===true;
          clip.transition='cut';delete clip.transitionDuration;delete clip.transitionDurationAuto;clip.autoTransition=false;if(before)changed++;else skipped++;continue;
        }
        const auto=duration==='auto',resolved=auto?automaticDuration(clip):explicitDuration(duration,clip);
        if(resolved===null){skipped++;continue}
        const same=clip.transition===type&&Math.abs((numeric(clip.transitionDuration)??-1)-resolved)<1e-6&&clip.transitionDurationAuto===auto&&clip.autoTransition===false;
        clip.transition=type;clip.transitionDuration=+resolved.toFixed(3);clip.transitionDurationAuto=auto;clip.autoTransition=false;if(same)skipped++;else changed++;
      }
      return {changed,locked,skipped,targets:pick.clips.length,reason:'ok',type,duration};
    }
  }
  ProfitMenteManualTransitionEngine.TYPES=[...TYPES];
  ProfitMenteManualTransitionEngine.SCOPES=[...SCOPES];
  ProfitMenteManualTransitionEngine.numeric=numeric;
  ProfitMenteManualTransitionEngine.canonicalTrack=canonicalTrack;
  ProfitMenteManualTransitionEngine.idKey=idKey;
  ProfitMenteManualTransitionEngine.sameId=sameId;
  ProfitMenteManualTransitionEngine.automaticDuration=automaticDuration;
  return {ProfitMenteManualTransitionEngine};
});
