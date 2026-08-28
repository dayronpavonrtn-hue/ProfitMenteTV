(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteRecoveryEngine=api.ProfitMenteRecoveryEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteRecoveryEngine{
  constructor(storage,{key='profitmente-recovery-v1',limit=20}={}){this.storage=storage;this.key=key;this.limit=Math.max(3,Math.min(100,limit|0||20))}
  _read(){try{const rows=JSON.parse(this.storage.getItem(this.key)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
  _write(rows){this.storage.setItem(this.key,JSON.stringify(rows.slice(0,this.limit)))}
  _fingerprint(project){const copy=structuredClone(project||{});delete copy.updatedAt;delete copy.recoveryMeta;return JSON.stringify(copy)}
  capture(project,reason='change',now=new Date().toISOString()){
    if(!project||typeof project!=='object')return null;
    const rows=this._read(),fingerprint=this._fingerprint(project),latest=rows[0];
    if(latest?.fingerprint===fingerprint)return structuredClone(latest);
    const snapshot={id:(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`),createdAt:now,reason,name:project.name||'Sin título',libraryId:project.libraryId||null,fingerprint,project:structuredClone(project)};
    rows.unshift(snapshot);this._write(rows);return structuredClone(snapshot)
  }
  list(project=null){let rows=this._read();if(project?.libraryId)rows=rows.filter(x=>!x.libraryId||x.libraryId===project.libraryId);return rows.map(({fingerprint,...x})=>structuredClone(x))}
  latest(project=null){return this.list(project)[0]||null}
  restore(id){const row=this._read().find(x=>x.id===id);return row?structuredClone(row.project):null}
  remove(id){const rows=this._read(),next=rows.filter(x=>x.id!==id);this._write(next);return next.length!==rows.length}
  clear(){this.storage.removeItem(this.key)}
  pruneBefore(iso){const next=this._read().filter(x=>(x.createdAt||'')>=iso);this._write(next);return next.length}
}
return {ProfitMenteRecoveryEngine};
});