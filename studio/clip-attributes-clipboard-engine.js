(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ProfitMenteClipAttributesClipboardEngine=api.ProfitMenteClipAttributesClipboardEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
  const clone=value=>{
    if(value===undefined)return undefined;
    if(typeof structuredClone==='function')try{return structuredClone(value)}catch{}
    return JSON.parse(JSON.stringify(value));
  };
  const numeric=value=>{
    if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol'||typeof value==='object')return null;
    const raw=String(value).trim();if(!raw)return null;
    const n=Number(raw);return Number.isFinite(n)?n:null;
  };
  const canonicalTrack=value=>{const n=numeric(value);return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?n:null};
  const idKey=value=>{if(value===null||value===undefined||typeof value==='boolean'||typeof value==='symbol'||typeof value==='object')return null;const raw=String(value).trim();if(!raw)return null;const n=numeric(value);return n===null?`s:${raw}`:`n:${n}`};
  const sameId=(a,b)=>{const x=idKey(a),y=idKey(b);return x!==null&&x===y};
  const kind=clip=>{const track=canonicalTrack(clip?.track);if([0,1,2].includes(track))return 'visual';if(track===3)return 'caption';if([4,5,6].includes(track))return 'audio';return null};
  const trackStates=(project,track)=>{const out=[];for(const map of [project?.trackState,project?.trackStates]){if(!map||typeof map!=='object'||Array.isArray(map))continue;for(const [key,value] of Object.entries(map))if(canonicalTrack(key)===track&&value&&typeof value==='object')out.push(value)}return out};
  const locked=(project,clip)=>clip?.locked===true||trackStates(project,canonicalTrack(clip?.track)).some(state=>state.locked===true);
  const clipById=(project,id)=>(project?.clips||[]).find(clip=>sameId(clip?.id,id))||null;

  const VISUAL_FIELDS=Object.freeze(['fitMode','flipX','flipY','positionX','positionY','scale','rotation','opacity','motion','keyframes','visualKeyframes','sourceVolume','muted']);
  const AUDIO_FIELDS=Object.freeze(['volume','fadeInMs','fadeOutMs']);
  const CAPTION_FIELDS=Object.freeze(['style','animation']);
  const fieldsFor=type=>type==='visual'?VISUAL_FIELDS:type==='audio'?AUDIO_FIELDS:type==='caption'?CAPTION_FIELDS:[];
  const safeValue=(field,value)=>{
    if(field==='fitMode')return ['cover','contain'].includes(value)?value:'cover';
    if(['flipX','flipY','muted'].includes(field))return value===true;
    if(['positionX','positionY'].includes(field)){const n=numeric(value);return n===null?0:Math.max(-200,Math.min(200,n))}
    if(field==='scale'){const n=numeric(value);return n===null?1:Math.max(.1,Math.min(8,n))}
    if(field==='rotation'){const n=numeric(value);return n===null?0:Math.max(-3600,Math.min(3600,n))}
    if(field==='opacity'){const n=numeric(value);return n===null?1:Math.max(0,Math.min(1,n))}
    if(field==='sourceVolume'||field==='volume'){const n=numeric(value);return n===null?1:Math.max(0,Math.min(2,n))}
    if(field==='fadeInMs'||field==='fadeOutMs'){const n=numeric(value);return n===null?0:Math.max(0,n)}
    if(field==='motion')return ['none','slow-zoom','push-in'].includes(value)?value:'none';
    if(field==='style')return typeof value==='string'&&value.trim()?value.trim():'dynamic';
    if(field==='animation')return typeof value==='string'&&value.trim()?value.trim():'none';
    if(field==='keyframes'||field==='visualKeyframes')return clone(value);
    return clone(value);
  };

  class ProfitMenteClipAttributesClipboardEngine{
    static copy(project,selectedId){
      const clip=clipById(project,selectedId),type=kind(clip);
      if(!clip||!type)return {ok:false,reason:'no-selection'};
      const values={};
      for(const field of fieldsFor(type))if(own(clip,field))values[field]=safeValue(field,clip[field]);
      return {ok:true,reason:'ok',data:{version:1,kind:type,values:clone(values)},count:Object.keys(values).length};
    }
    static compatible(project,selectedId,data){
      const clip=clipById(project,selectedId),targetKind=kind(clip);
      return !!clip&&!!targetKind&&data?.version===1&&data?.kind===targetKind&&data.values&&typeof data.values==='object'&&!Array.isArray(data.values);
    }
    static paste(project,selectedId,data){
      const clip=clipById(project,selectedId),targetKind=kind(clip);
      if(!clip||!targetKind)return {changed:0,reason:'no-selection'};
      if(locked(project,clip))return {changed:0,reason:'locked'};
      if(!this.compatible(project,selectedId,data))return {changed:0,reason:'incompatible'};
      const allowed=new Set(fieldsFor(targetKind)),patch={};
      for(const [field,value] of Object.entries(data.values))if(allowed.has(field))patch[field]=safeValue(field,value);
      const before={};for(const field of Object.keys(patch))before[field]=own(clip,field)?clone(clip[field]):undefined;
      try{
        let changed=0;
        for(const [field,value] of Object.entries(patch)){
          const prev=own(clip,field)?clip[field]:undefined;
          if(JSON.stringify(prev)!==JSON.stringify(value)){clip[field]=clone(value);changed++}
        }
        return {changed,reason:'ok',kind:targetKind,fields:Object.keys(patch)};
      }catch(error){
        for(const [field,value] of Object.entries(before)){if(value===undefined)delete clip[field];else clip[field]=value}
        return {changed:0,reason:'rollback',error};
      }
    }
  }
  ProfitMenteClipAttributesClipboardEngine.VISUAL_FIELDS=VISUAL_FIELDS;
  ProfitMenteClipAttributesClipboardEngine.AUDIO_FIELDS=AUDIO_FIELDS;
  ProfitMenteClipAttributesClipboardEngine.CAPTION_FIELDS=CAPTION_FIELDS;
  ProfitMenteClipAttributesClipboardEngine.canonicalTrack=canonicalTrack;
  ProfitMenteClipAttributesClipboardEngine.sameId=sameId;
  ProfitMenteClipAttributesClipboardEngine.kind=kind;
  ProfitMenteClipAttributesClipboardEngine.locked=locked;
  return {ProfitMenteClipAttributesClipboardEngine};
});
