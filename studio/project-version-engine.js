(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectVersionEngine=api.ProfitMenteProjectVersionEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectVersionEngine{
  constructor(storage,key='profitmente-project-versions',limit=20){this.storage=storage;this.key=key;this.limit=Math.max(3,Number(limit)||20)}
  _read(){try{const x=JSON.parse(this.storage.getItem(this.key)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}}
  _write(x){this.storage.setItem(this.key,JSON.stringify(x))}
  projectKey(project){return project?.libraryId||project?.id||`draft:${String(project?.name||'untitled').trim().toLowerCase()}`}
  list(project){const all=this._read(),key=this.projectKey(project);return (all[key]||[]).slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))}
  signature(project){try{return JSON.stringify(project)}catch{return ''}}
  create(project,label='Punto de control'){
    const all=this._read(),key=this.projectKey(project),rows=all[key]||[],now=new Date().toISOString();
    const row={id:(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`),label:String(label||'Punto de control').trim().slice(0,80)||'Punto de control',createdAt:now,project:structuredClone(project)};
    rows.unshift(row);all[key]=rows.slice(0,this.limit);this._write(all);return structuredClone(row)
  }
  createIfChanged(project,label='Punto de control'){
    const latest=this.list(project)[0],signature=this.signature(project);
    if(latest&&signature&&this.signature(latest.project)===signature)return {created:false,row:structuredClone(latest)};
    return {created:true,row:this.create(project,label)}
  }
  restore(project,versionId){const row=this.list(project).find(v=>v.id===versionId);return row?structuredClone(row.project):null}
  remove(project,versionId){const all=this._read(),key=this.projectKey(project),rows=all[key]||[],next=rows.filter(v=>v.id!==versionId);if(next.length)all[key]=next;else delete all[key];this._write(all);return next.length!==rows.length}
  clear(project){const all=this._read(),key=this.projectKey(project);const had=Array.isArray(all[key])&&all[key].length>0;delete all[key];this._write(all);return had}
}
return {ProfitMenteProjectVersionEngine};
});
