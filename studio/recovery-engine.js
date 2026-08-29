(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteRecoveryEngine=api.ProfitMenteRecoveryEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteRecoveryEngine{
  constructor(storage,{key='profitmente-recovery-v1',limit=20}={}){this.storage=storage;this.key=key;this.limit=Math.max(3,Math.min(100,limit|0||20))}
  _read(){try{const rows=JSON.parse(this.storage.getItem(this.key)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
  _write(rows){this.storage.setItem(this.key,JSON.stringify(rows.slice(0,this.limit)))}
  _fingerprint(project){const copy=structuredClone(project||{});delete copy.updatedAt;delete copy.recoveryMeta;return JSON.stringify(copy)}
  _group(project){return project?.libraryId?`library:${project.libraryId}`:`draft:${project?.name||'Sin título'}`}
  capture(project,reason='change',now=new Date().toISOString()){
    if(!project||typeof project!=='object')return null;
    const rows=this._read(),fingerprint=this._fingerprint(project),group=this._group(project),latest=rows.find(x=>x.group===group);
    if(latest?.fingerprint===fingerprint)return structuredClone(latest);
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