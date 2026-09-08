(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const DECIMAL=/^[+-]?(?:\d+\.?\d*|\.\d+)$/;
  function scalar(v){
    if(typeof v==='number')return Number.isFinite(v)?String(v):null;
    if(typeof v!=='string')return null;
    const s=v.trim();return s||null;
  }
  function num(v){const s=scalar(v);if(s===null||!DECIMAL.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null}
  function key(v){const s=scalar(v);if(s===null)return null;if(DECIMAL.test(s)){const n=Number(s);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}return `s:${s}`}
  function same(a,b){const x=key(a),y=key(b);return x!==null&&x===y}
  function trackKey(v){const n=num(v);return Number.isInteger(n)&&n>=0&&n<=6?String(n):null}
  function trackLocked(project,track){
    const tk=trackKey(track);if(tk===null)return true;
    for(const states of [project?.trackState,project?.trackStates]){
      if(!states||typeof states!=='object'||Array.isArray(states))continue;
      for(const [k,state] of Object.entries(states))if(trackKey(k)===tk&&state?.locked===true)return true;
    }
    return false;
  }
  function cloneData(value){
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
  class ProfitMenteClipClipboardEngine{
    constructor(){this.payload=null}
    collect(project,anchorId){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const matches=clips.filter(c=>same(c?.id,anchorId));
      if(matches.length!==1)return {ok:false,reason:matches.length?'ambiguous':'missing'};
      const anchor=matches[0],group=scalar(anchor.groupId);
      const selected=group===null?[anchor]:clips.filter(c=>scalar(c?.groupId)===group);
      if(!selected.length)return {ok:false,reason:'missing'};
      const seen=new Set();
      for(const c of selected){
        const idKey=key(c?.id),s=num(c?.start),d=num(c?.duration);
        if(idKey===null||trackKey(c?.track)===null||s===null||d===null||s<0||d<=0)return {ok:false,reason:'invalid'};
        if(seen.has(idKey))return {ok:false,reason:'ambiguous'};
        seen.add(idKey);
      }
      const origin=Math.min(...selected.map(c=>num(c.start)));
      const snapshot=selected.map(c=>({clip:cloneData(c),offset:num(c.start)-origin}));
      this.payload={version:1,origin,items:snapshot};
      return {ok:true,count:snapshot.length,origin};
    }
    hasData(){return !!(this.payload&&Array.isArray(this.payload.items)&&this.payload.items.length)}
    clear(){this.payload=null}
    paste(project,at,options={}){
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'project'};
      if(!this.hasData())return {ok:false,reason:'empty'};
      const pasteAt=num(at);if(pasteAt===null||pasteAt<0)return {ok:false,reason:'time'};
      const items=this.payload.items,existingKeys=new Set();
      for(const c of project.clips){const k=key(c?.id);if(k===null)return {ok:false,reason:'invalid'};if(existingKeys.has(k))return {ok:false,reason:'ambiguous'};existingKeys.add(k)}
      const sourceGroups=new Map(),plans=[];
      for(const entry of items){
        const src=entry?.clip,offset=num(entry?.offset),duration=num(src?.duration),track=trackKey(src?.track);
        if(!src||offset===null||offset<0||duration===null||duration<=0||track===null)return {ok:false,reason:'invalid'};
        if(trackLocked(project,track))return {ok:false,reason:'locked',track:Number(track)};
        const start=pasteAt+offset;if(!Number.isFinite(start))return {ok:false,reason:'time'};
        const copy=cloneData(src);copy.start=start;copy.track=Number(track);
        copy.id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        while(existingKeys.has(key(copy.id)))copy.id=`${copy.id}-copy`;
        existingKeys.add(key(copy.id));
        const g=scalar(src.groupId);
        if(g!==null){if(!sourceGroups.has(g))sourceGroups.set(g,typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`group-${Date.now()}-${sourceGroups.size}`);copy.groupId=sourceGroups.get(g)}
        plans.push(copy);
      }
      const end=Math.max(...plans.map(c=>num(c.start)+num(c.duration))),currentDuration=num(project.duration);
      if(currentDuration===null||currentDuration<=0)return {ok:false,reason:'duration'};
      if(options.extendDuration===false&&end>currentDuration)return {ok:false,reason:'boundary',end};
      const nextDuration=end>currentDuration?end:currentDuration;
      project.clips.push(...plans);project.duration=nextDuration;
      return {ok:true,count:plans.length,clips:plans,end,duration:project.duration};
    }
  }
  root.ProfitMenteClipClipboardEngine=ProfitMenteClipClipboardEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteClipClipboardEngine};
})();
