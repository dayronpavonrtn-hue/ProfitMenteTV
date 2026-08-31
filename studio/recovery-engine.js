(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteRecoveryEngine=api.ProfitMenteRecoveryEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteRecoveryEngine{
  constructor(storage,{key='profitmente-recovery-v1',limit=20}={}){this.storage=storage;this.key=key;this.limit=Math.max(3,Math.min(100,limit|0||20))}
  _isProject(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
  _fingerprint(project){const copy=structuredClone(project||{});delete copy.updatedAt;delete copy.recoveryMeta;return JSON.stringify(copy)}
  _group(project){return project?.libraryId?`library:${project.libraryId}`:`draft:${project?.name||'Sin título'}`}
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
    const rows=[];let invalid=0;
    for(const row of parsed){try{const normalized=this._normalizeRow(row);if(normalized)rows.push(normalized);else invalid+=1}catch{invalid+=1}}
    return {rows,invalid};
  }
  _read(){return this._decode().rows}
  _write(rows){this.storage.setItem(this.key,JSON.stringify(rows.slice(0,this.limit)))}
  repair(){const {rows,invalid}=this._decode();this._write(rows);return {kept:rows.length,removed:invalid}}
  capture(project,reason='change',now=new Date().toISOString()){
    if(!this._isProject(project))return null;
    const {rows,invalid}=this._decode();let fingerprint;try{fingerprint=this._fingerprint(project)}catch{return null}
    const group=this._group(project),latest=rows.find(x=>x.group===group);
    if(latest?.fingerprint===fingerprint){if(invalid)this._write(rows);return structuredClone(latest)}
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