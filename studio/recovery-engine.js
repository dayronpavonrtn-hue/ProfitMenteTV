(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteRecoveryEngine=api.ProfitMenteRecoveryEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteRecoveryEngine{
  constructor(storage,{key='profitmente-recovery-v1',limit=20}={}){this.storage=storage;this.key=key;this.limit=Math.max(3,Math.min(100,limit|0||20))}
  _isProject(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
  _fingerprint(project){const copy=structuredClone(project||{});delete copy.updatedAt;delete copy.recoveryMeta;return JSON.stringify(copy)}
  _draftId(project){const id=project?.recoveryMeta?.draftId;return typeof id==='string'&&id.trim()?id.trim():null}
  _newDraftId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}
  _setDraftId(project,id){
    if(!this._isProject(project)||project.libraryId||!id)return null;
    if(!project.recoveryMeta||typeof project.recoveryMeta!=='object'||Array.isArray(project.recoveryMeta))project.recoveryMeta={};
    project.recoveryMeta.draftId=id;return id;
  }
  _group(project){if(project?.libraryId)return `library:${project.libraryId}`;const draftId=this._draftId(project);return draftId?`draft-id:${draftId}`:`draft:${project?.name||'Sin título'}`}
  _normalizeRow(row){
    if(!row||typeof row!=='object'||Array.isArray(row)||!this._isProject(row.project))return null;
    const id=typeof row.id==='string'&&row.id.trim()?row.id.trim():null;if(!id)return null;
    const project=structuredClone(row.project),group=typeof row.group==='string'&&row.group.trim()?row.group.trim():this._group(project);
    const createdAt=typeof row.createdAt==='string'?row.createdAt:'';
    const reason=typeof row.reason==='string'&&row.reason.trim()?row.reason:'recuperación';
    const name=typeof row.name==='string'&&row.name.trim()?row.name:(project.name||'Sin título');
    const libraryId=row.libraryId??project.libraryId??null;
    let fingerprint=typeof row.fingerprint==='string'&&row.fingerprint?row.fingerprint:null;
    if(!fingerprint){try{fingerprint=this._fingerprint(project)}catch{return null}}
    return {id,createdAt,reason,name,libraryId,group,fingerprint,project};
  }
  _decode(){
    let parsed;try{parsed=JSON.parse(this.storage.getItem(this.key)||'[]')}catch{return {rows:[],invalid:1}}
    if(!Array.isArray(parsed))return {rows:[],invalid:1};
    const rows=[],seenIds=new Set();let invalid=0;
    for(const row of parsed){
      try{
        const normalized=this._normalizeRow(row);
        if(!normalized||seenIds.has(normalized.id)){invalid+=1;continue}
        seenIds.add(normalized.id);rows.push(normalized)
      }catch{invalid+=1}
    }
    return {rows,invalid};
  }
  _read(){return this._decode().rows}
  _write(rows){
    // The recovery budget is shared by every Studio project. A hot project can
    // generate many snapshots in seconds, so a plain rows.slice(0, limit) can
    // evict every recovery point belonging to other projects. Reserve up to two
    // recent points per project group first, then spend the remaining capacity
    // strictly by recency. With a single project this still retains the full
    // configured history budget.
    const valid=Array.isArray(rows)?rows.filter(Boolean):[],selected=new Set(),perGroup=new Map();
    for(const row of valid){
      if(selected.size>=this.limit)break;
      const group=row.group||this._group(row.project),count=perGroup.get(group)||0;
      if(count>=2)continue;
      selected.add(row.id);perGroup.set(group,count+1);
    }
    for(const row of valid){if(selected.size>=this.limit)break;if(!selected.has(row.id))selected.add(row.id)}
    this.storage.setItem(this.key,JSON.stringify(valid.filter(row=>selected.has(row.id)).slice(0,this.limit)))
  }
  _prepareDraftIdentity(project,rows,fingerprint){
    if(project?.libraryId)return {group:this._group(project),changed:false};
    let draftId=this._draftId(project),changed=false;
    if(!draftId){
      // When a page reload happens before recoveryMeta reaches the main project
      // record, adopt the identity from an exact recovery snapshot instead of
      // starting a second history for the same draft.
      const exact=rows.find(row=>!row.libraryId&&row.fingerprint===fingerprint&&this._draftId(row.project));
      const named=rows.filter(row=>!row.libraryId&&(row.name||row.project?.name)===(project?.name||'Sin título')&&this._draftId(row.project));
      draftId=this._draftId(exact?.project)||(named.length===1?this._draftId(named[0].project):null)||this._newDraftId();
      this._setDraftId(project,draftId);changed=true;
    }
    const group=`draft-id:${draftId}`,legacyGroup=`draft:${project?.name||'Sin título'}`;
    // Upgrade snapshots produced before draft identities existed. Restrict the
    // migration to the current legacy name so unrelated unsaved drafts stay
    // isolated even if the shared recovery store contains many projects.
    for(const row of rows){
      if(row.libraryId||row.group!==legacyGroup)continue;
      this._setDraftId(row.project,draftId);row.group=group;changed=true;
    }
    return {group,changed};
  }
  repair(){const {rows,invalid}=this._decode();this._write(rows);return {kept:this._read().length,removed:invalid}}
  capture(project,reason='change',now=new Date().toISOString()){
    if(!this._isProject(project))return null;
    const {rows,invalid}=this._decode();let fingerprint;try{fingerprint=this._fingerprint(project)}catch{return null}
    const prepared=this._prepareDraftIdentity(project,rows,fingerprint),group=prepared.group,latest=rows.find(x=>x.group===group);
    if(latest?.fingerprint===fingerprint){if(invalid||prepared.changed)this._write(rows);return structuredClone(latest)}
    const snapshot={id:(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`),createdAt:now,reason,name:project.name||'Sin título',libraryId:project.libraryId||null,group,fingerprint,project:structuredClone(project)};
    rows.unshift(snapshot);this._write(rows);return structuredClone(snapshot)
  }
  list(project=null){let rows=this._read();if(project)rows=rows.filter(x=>x.group===this._group(project));return rows.map(({fingerprint,...x})=>structuredClone(x))}
  listGroups(){
    const groups=new Map();
    for(const row of this._read()){
      const current=groups.get(row.group);
      if(current){current.count+=1;continue}
      groups.set(row.group,{group:row.group,name:row.name||'Sin título',libraryId:row.libraryId||null,count:1,latestAt:row.createdAt||'',latestId:row.id});
    }
    return [...groups.values()].sort((a,b)=>(b.latestAt||'').localeCompare(a.latestAt||'')).map(x=>structuredClone(x))
  }
  latest(project=null){return this.list(project)[0]||null}
  restore(id){const row=this._read().find(x=>x.id===id);return row?structuredClone(row.project):null}
  remove(id){const rows=this._read(),next=rows.filter(x=>x.id!==id);this._write(next);return next.length!==rows.length}
  clear(){this.storage.removeItem(this.key)}
  pruneBefore(iso){const next=this._read().filter(x=>(x.createdAt||'')>=iso);this._write(next);return next.length}
}
return {ProfitMenteRecoveryEngine};
});