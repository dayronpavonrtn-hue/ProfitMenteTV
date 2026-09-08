(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const NUMERIC=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const LIMITS={brightness:[-100,100],contrast:[-90,100],saturation:[-100,200],hue:[-180,180]};
  const PRESETS={
    natural:{brightness:0,contrast:0,saturation:0,hue:0},
    vivid:{brightness:4,contrast:14,saturation:28,hue:0},
    warm:{brightness:3,contrast:8,saturation:12,hue:-8},
    cool:{brightness:1,contrast:9,saturation:8,hue:10},
    mono:{brightness:0,contrast:14,saturation:-100,hue:0}
  };
  function strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text||!NUMERIC.test(text))return null;
    const n=Number(text);return Number.isFinite(n)?n:null;
  }
  function identityKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text)return null;
    if(NUMERIC.test(text)){const n=Number(text);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}
    return `s:${text}`;
  }
  function canonicalTrack(value){const n=strictNumber(value);return Number.isInteger(n)&&n>=0&&n<=6?n:null}
  function stateLocked(states,track){
    const target=canonicalTrack(track);if(target===null||!states||typeof states!=='object'||Array.isArray(states))return false;
    return Object.entries(states).some(([key,state])=>canonicalTrack(key)===target&&state&&typeof state==='object'&&!Array.isArray(state)&&state.locked===true);
  }
  function isLocked(project,clip){return !!clip&&(clip.locked===true||stateLocked(project?.trackState,clip.track)||stateLocked(project?.trackStates,clip.track))}
  function isVisual(clip){const t=canonicalTrack(clip?.track);return !!clip&&(t===0||t===1)}
  function validatedPatch(patch){
    if(!patch||typeof patch!=='object'||Array.isArray(patch))return null;
    const out={};let count=0;
    for(const [key,value] of Object.entries(patch)){
      if(!(key in LIMITS))return null;
      const n=strictNumber(value);if(n===null)return null;
      const [lo,hi]=LIMITS[key];out[key]=Math.max(lo,Math.min(hi,n));count++;
    }
    return count?out:null;
  }
  function targetSet(project,{scope='selection',ids=[],track=null}={}){
    const clips=Array.isArray(project?.clips)?project.clips:[];
    if(scope==='all')return {ok:true,clips:clips.filter(isVisual)};
    if(scope==='track'){
      const target=canonicalTrack(track);if(target===null||target>1)return {ok:false,reason:'invalid-track',clips:[]};
      return {ok:true,clips:clips.filter(c=>isVisual(c)&&canonicalTrack(c.track)===target)};
    }
    if(scope!=='selection'||!Array.isArray(ids))return {ok:false,reason:'invalid-scope',clips:[]};
    const keys=[];
    for(const id of ids){const key=identityKey(id);if(key===null)return {ok:false,reason:'invalid-id',clips:[]};keys.push(key)}
    const wanted=new Set(keys);if(!wanted.size)return {ok:false,reason:'empty-selection',clips:[]};
    const matches=clips.filter(c=>{const key=identityKey(c?.id);return key!==null&&wanted.has(key)});
    for(const key of wanted){if(matches.filter(c=>identityKey(c?.id)===key).length!==1)return {ok:false,reason:'ambiguous-id',clips:[]}}
    return {ok:true,clips:matches.filter(isVisual)};
  }
  function applyPatch(project,patch,options={}){
    const next=validatedPatch(patch);if(!next)return {changed:0,blocked:0,reason:'invalid-grade'};
    const target=targetSet(project,options);if(!target.ok)return {changed:0,blocked:0,reason:target.reason};
    if(!target.clips.length)return {changed:0,blocked:0,reason:'no-visual-targets'};
    const locked=target.clips.filter(c=>isLocked(project,c));
    if(locked.length)return {changed:0,blocked:locked.length,reason:'locked-targets'};
    let changed=0;
    for(const clip of target.clips){
      if(Object.entries(next).some(([key,value])=>strictNumber(clip[key])!==value)){Object.assign(clip,next);changed++}
    }
    return {changed,blocked:0,reason:changed?'ok':'unchanged',total:target.clips.length};
  }
  function applyPreset(project,name,options={}){
    if(typeof name!=='string'||!Object.prototype.hasOwnProperty.call(PRESETS,name))return {changed:0,blocked:0,reason:'invalid-preset'};
    return applyPatch(project,PRESETS[name],options);
  }
  function reset(project,options={}){return applyPreset(project,'natural',options)}
  const api={strictNumber,identityKey,canonicalTrack,stateLocked,isLocked,isVisual,validatedPatch,targetSet,applyPatch,applyPreset,reset,presets:PRESETS,limits:LIMITS};
  root.ProfitMenteColorGradeBatchEngine=api;
  if(typeof module!=='undefined')module.exports={ProfitMenteColorGradeBatchEngine:api};
})();
