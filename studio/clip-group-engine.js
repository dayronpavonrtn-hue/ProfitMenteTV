(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteClipGroupEngine{
    normalizeId(value){return value==null?'':String(value).trim()}
    clips(project){return Array.isArray(project?.clips)?project.clips:[]}
    groupId(clip){return this.normalizeId(clip?.groupId)}
    members(project,groupId){const id=this.normalizeId(groupId);return id?this.clips(project).filter(c=>this.groupId(c)===id):[]}
    groups(project){
      const map=new Map();
      for(const clip of this.clips(project)){
        const id=this.groupId(clip);if(!id)continue;
        if(!map.has(id))map.set(id,[]);map.get(id).push(clip);
      }
      return map;
    }
    createId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`group-${Date.now()}-${Math.random().toString(16).slice(2)}`}
    group(project,clipIds){
      const ids=new Set((clipIds||[]).filter(Boolean).map(String));
      const selected=this.clips(project).filter(c=>ids.has(String(c.id)));
      if(selected.length<2)return {changed:0,groupId:'',members:selected.map(c=>c.id),reason:'not-enough'};
      const groupId=this.createId();let changed=0;
      for(const clip of selected){if(this.groupId(clip)!==groupId){clip.groupId=groupId;changed++}}
      return {changed,groupId,members:selected.map(c=>c.id),reason:'ok'}
    }
    ungroup(project,clipIds){
      const ids=new Set((clipIds||[]).filter(Boolean).map(String));
      const selected=this.clips(project).filter(c=>ids.has(String(c.id)));
      const groupIds=new Set(selected.map(c=>this.groupId(c)).filter(Boolean));
      if(!groupIds.size)return {changed:0,groups:0,members:[],reason:'not-grouped'};
      const members=this.clips(project).filter(c=>groupIds.has(this.groupId(c)));let changed=0;
      for(const clip of members){if(this.groupId(clip)){delete clip.groupId;changed++}}
      return {changed,groups:groupIds.size,members:members.map(c=>c.id),reason:'ok'}
    }
    expand(project,clipIds){
      const seedIds=new Set((clipIds||[]).filter(Boolean).map(String)),groupIds=new Set();
      for(const clip of this.clips(project))if(seedIds.has(String(clip.id))&&this.groupId(clip))groupIds.add(this.groupId(clip));
      if(!groupIds.size)return [...seedIds];
      const out=new Set(seedIds);for(const clip of this.clips(project))if(groupIds.has(this.groupId(clip)))out.add(String(clip.id));return [...out]
    }
    validate(project){
      const groups=this.groups(project),orphans=[];
      for(const [id,members] of groups)if(members.length<2)orphans.push({groupId:id,clipId:members[0]?.id});
      return {groups:groups.size,orphans,ok:orphans.length===0}
    }
    repair(project){
      const report=this.validate(project);for(const item of report.orphans){const clip=this.clips(project).find(c=>String(c.id)===String(item.clipId));if(clip)delete clip.groupId}
      return {...report,repaired:report.orphans.length}
    }
  }
  root.ProfitMenteClipGroupEngine=ProfitMenteClipGroupEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteClipGroupEngine};
})();