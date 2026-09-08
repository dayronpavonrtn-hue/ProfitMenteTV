class ProfitMenteRazorAllEngine{
  constructor(splitEngine=globalThis.ProfitMenteSplitEditEngine){this.Split=splitEngine}
  strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
    const n=Number(raw);return Number.isFinite(n)?n:null;
  }
  idKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}
    return `s:${raw}`;
  }
  groupKey(value){
    if(value===undefined||value===null)return '';
    if(typeof value!=='string'&&typeof value!=='number')return '';
    return String(value).trim();
  }
  trackKey(value){const n=this.strictNumber(value);return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?String(Object.is(n,-0)?0:n):null}
  trackLocked(project,clip){
    const key=this.trackKey(clip?.track);if(key===null)return false;
    return [project?.trackState,project?.trackStates].some(map=>map&&typeof map==='object'&&Object.entries(map).some(([raw,state])=>this.trackKey(raw)===key&&state&&typeof state==='object'&&state.locked===true));
  }
  locked(project,clip){return clip?.locked===true||this.trackLocked(project,clip)}
  bounds(clip){
    const start=this.strictNumber(clip?.start),duration=this.strictNumber(clip?.duration),track=this.trackKey(clip?.track);
    if(start===null||duration===null||start<0||duration<0||track===null)return null;
    return {start,duration,end:start+duration,track};
  }
  canSplit(clip,time,minEdge=.05){const b=this.bounds(clip);return !!b&&b.duration>minEdge*2&&time>b.start+minEdge&&time<b.end-minEdge}
  clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}
  trimWords(clip,start,end){
    if(!Array.isArray(clip.wordTimings))return;
    const out=[];
    for(const timing of clip.wordTimings){
      if(!timing||typeof timing!=='object')continue;
      const ws=this.strictNumber(timing.start),we=this.strictNumber(timing.end);if(ws===null||we===null||we<=ws||we<=start||ws>=end)continue;
      const item=this.clone(timing);item.start=Math.max(start,ws);item.end=Math.min(end,we);item.duration=Math.max(0,item.end-item.start);if(item.duration>.0001)out.push(item);
    }
    clip.wordTimings=out.map((item,index)=>({...item,index}));
    if(Number(clip.track)===3){const text=clip.wordTimings.map(x=>String(x.word||'').trim()).filter(Boolean).join(' ');if(text)clip.name=text}
  }
  validate(project,time){
    if(!project||!Array.isArray(project.clips))return {ok:false,reason:'invalid-project'};
    const t=this.strictNumber(time);if(t===null||t<0)return {ok:false,reason:'invalid-time'};
    const duration=project.duration===undefined?null:this.strictNumber(project.duration);if(duration!==null&&t>duration+.000001)return {ok:false,reason:'outside-project'};
    const seen=new Set();
    for(const clip of project.clips){
      if(!clip||typeof clip!=='object')return {ok:false,reason:'invalid-clip'};
      const key=this.idKey(clip.id);if(key===null)return {ok:false,reason:'invalid-id'};if(seen.has(key))return {ok:false,reason:'ambiguous-id'};seen.add(key);
      if(!this.bounds(clip))return {ok:false,reason:'invalid-clip'};
    }
    return {ok:true,time:t};
  }
  makeUniqueId(used,idFactory){
    for(let attempt=0;attempt<20;attempt++){
      const candidate=typeof idFactory==='function'?idFactory():globalThis.crypto?.randomUUID?.()||`razor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const key=this.idKey(candidate);if(key!==null&&!used.has(key)){used.add(key);return candidate}
    }
    let candidate;do{candidate=`razor-${Date.now()}-${Math.random().toString(16).slice(2)}`}while(used.has(this.idKey(candidate)));used.add(this.idKey(candidate));return candidate;
  }
  split(project,time,{idFactory,groupIdFactory,minEdge=.05}={}){
    if(!this.Split?.split)return {ok:false,reason:'split-engine-missing'};
    const valid=this.validate(project,time);if(!valid.ok)return valid;const t=valid.time;
    const crossing=project.clips.filter(c=>this.canSplit(c,t,minEdge));if(!crossing.length)return {ok:false,reason:'no-crossing',time:t};
    const groupMembers=new Map();for(const clip of project.clips){const gid=this.groupKey(clip.groupId);if(gid){if(!groupMembers.has(gid))groupMembers.set(gid,[]);groupMembers.get(gid).push(clip)}}
    const units=[],seenUnits=new Set();
    for(const clip of crossing){
      const gid=this.groupKey(clip.groupId);const unitKey=gid?`g:${gid}`:`c:${this.idKey(clip.id)}`;if(seenUnits.has(unitKey))continue;seenUnits.add(unitKey);units.push({gid,members:gid?(groupMembers.get(gid)||[clip]):[clip]});
    }
    const editable=[],skipped=[];
    for(const unit of units){
      const locked=unit.members.filter(c=>this.locked(project,c));
      if(locked.length){skipped.push({reason:'locked',gid:unit.gid,count:unit.members.length});continue}
      if(unit.members.some(c=>!this.canSplit(c,t,minEdge))){skipped.push({reason:'group-misaligned',gid:unit.gid,count:unit.members.length});continue}
      editable.push(unit);
    }
    const used=new Set(project.clips.map(c=>this.idKey(c.id)).filter(Boolean)),replacements=new Map(),newRightIds=[],rightByOriginal=[],groupCuts=[];
    for(const unit of editable){
      const leftGroup=unit.gid&&unit.members.length>1?(typeof groupIdFactory==='function'?groupIdFactory('left',unit.gid):unit.gid):'';
      const rightGroup=unit.gid&&unit.members.length>1?(typeof groupIdFactory==='function'?groupIdFactory('right',unit.gid):globalThis.crypto?.randomUUID?.()||`group-right-${Date.now()}-${Math.random().toString(16).slice(2)}`):'';
      for(const clip of unit.members){
        const rightId=this.makeUniqueId(used,idFactory),result=this.Split.split(clip,t,{idFactory:()=>rightId,minEdge});if(!result?.ok)return {ok:false,reason:'split-failed',clipId:clip.id,time:t};
        const b=this.bounds(clip);this.trimWords(result.left,b.start,t);this.trimWords(result.right,t,b.end);
        if(unit.gid&&unit.members.length>1){result.left.groupId=leftGroup;result.right.groupId=rightGroup}else{delete result.left.groupId;delete result.right.groupId}
        replacements.set(this.idKey(clip.id),[result.left,result.right]);newRightIds.push(result.right.id);rightByOriginal.push({originalId:clip.id,rightId:result.right.id});
      }
      if(unit.gid)groupCuts.push({oldGroupId:unit.gid,leftGroupId:leftGroup,rightGroupId:rightGroup,count:unit.members.length});
    }
    if(!replacements.size)return {ok:false,reason:'nothing-editable',time:t,skipped,blocked:skipped.filter(x=>x.reason==='locked').length,misaligned:skipped.filter(x=>x.reason==='group-misaligned').length};
    project.clips=project.clips.flatMap(c=>replacements.get(this.idKey(c.id))||[c]);
    return {ok:true,time:t,cuts:replacements.size,newRightIds,rightByOriginal,groups:groupCuts,skipped,blocked:skipped.filter(x=>x.reason==='locked').length,misaligned:skipped.filter(x=>x.reason==='group-misaligned').length};
  }
}
if(typeof window!=='undefined')window.ProfitMenteRazorAllEngine=ProfitMenteRazorAllEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRazorAllEngine;
