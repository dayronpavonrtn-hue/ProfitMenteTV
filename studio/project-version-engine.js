(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectVersionEngine=api.ProfitMenteProjectVersionEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectVersionEngine{
  constructor(storage,key='profitmente-project-versions',limit=20){this.storage=storage;this.key=key;this.limit=Math.max(3,Number(limit)||20)}
  _cleanRow(row,seen){
    if(!row||typeof row!=='object'||Array.isArray(row)||!row.project||typeof row.project!=='object'||Array.isArray(row.project))return null;
    const id=String(row.id||'').trim();if(!id||seen.has(id))return null;seen.add(id);
    return {id,label:String(row.label||'Punto de control').trim().slice(0,80)||'Punto de control',createdAt:typeof row.createdAt==='string'?row.createdAt:'',project:structuredClone(row.project)};
  }
  _sanitize(raw){
    const out=Object.create(null);if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
    for(const key of Object.keys(raw)){
      if(!Array.isArray(raw[key]))continue;
      const seen=new Set(),rows=[];
      for(const candidate of raw[key]){const row=this._cleanRow(candidate,seen);if(row)rows.push(row);if(rows.length>=this.limit)break}
      if(rows.length)out[key]=rows;
    }
    return out;
  }
  _read(){try{return this._sanitize(JSON.parse(this.storage.getItem(this.key)||'{}'))}catch{return Object.create(null)}}
  _write(x){this.storage.setItem(this.key,JSON.stringify(this._sanitize(x)))}
  _identity(value){
    if(typeof value==='string'){const text=value.trim();return text||null}
    if(typeof value==='number'&&Number.isFinite(value))return String(Object.is(value,-0)?0:value);
    return null;
  }
  projectKey(project){
    const libraryId=this._identity(project?.libraryId);if(libraryId!==null)return libraryId;
    const id=this._identity(project?.id);if(id!==null)return id;
    const name=this._identity(project?.name);return `draft:${(name||'untitled').toLowerCase()}`;
  }
  _rows(all,key){return Object.prototype.hasOwnProperty.call(all,key)&&Array.isArray(all[key])?all[key]:[]}
  list(project){const all=this._read(),key=this.projectKey(project);return this._rows(all,key).slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))}
  signature(project){try{return JSON.stringify(project)}catch{return ''}}
  create(project,label='Punto de control'){
    const all=this._read(),key=this.projectKey(project),rows=this._rows(all,key).slice(),now=new Date().toISOString();
    const row={id:(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`),label:String(label||'Punto de control').trim().slice(0,80)||'Punto de control',createdAt:now,project:structuredClone(project)};
    rows.unshift(row);all[key]=rows.slice(0,this.limit);this._write(all);return structuredClone(row)
  }
  createIfChanged(project,label='Punto de control'){
    const latest=this.list(project)[0],signature=this.signature(project);
    if(latest&&signature&&this.signature(latest.project)===signature)return {created:false,row:structuredClone(latest)};
    return {created:true,row:this.create(project,label)}
  }
  restore(project,versionId){const id=String(versionId||'').trim();if(!id)return null;const row=this.list(project).find(v=>v.id===id);return row?structuredClone(row.project):null}
  remove(project,versionId){const id=String(versionId||'').trim();if(!id)return false;const all=this._read(),key=this.projectKey(project),rows=this._rows(all,key),next=rows.filter(v=>v.id!==id);if(next.length)all[key]=next;else delete all[key];this._write(all);return next.length!==rows.length}
  clear(project){const all=this._read(),key=this.projectKey(project),had=this._rows(all,key).length>0;delete all[key];this._write(all);return had}
  repair(){const clean=this._read();this._write(clean);return Object.values(clean).reduce((sum,rows)=>sum+(Array.isArray(rows)?rows.length:0),0)}
}
return {ProfitMenteProjectVersionEngine};
});
