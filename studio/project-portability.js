class ProfitMenteProjectPortability{
  static idKey(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}
    return `s:${raw}`;
  }
  static assetMeta(asset={}){
    if(this.idKey(asset?.id)===null)return null;
    const out={id:asset.id};
    for(const key of ['name','type','mime']){const value=typeof asset[key]==='string'?asset[key].trim():'';if(value)out[key]=value}
    for(const key of ['size','duration','width','height','metadataVersion','sourceLastModified']){const value=Number(asset[key]);if(Number.isFinite(value)&&value>=0)out[key]=value}
    for(const key of ['sourceFingerprint','sourceContentHash','sourceLegacyContentHash','sourceHashVersion','sourceRelativePath','importOrigin']){const value=typeof asset[key]==='string'?asset[key].trim():'';if(value)out[key]=value}
    return out;
  }
  static referenced(project={}){
    const refs=new Map();
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){const key=this.idKey(clip?.asset);if(key!==null&&!refs.has(key))refs.set(key,clip.asset)}
    return refs;
  }
  static serialize(project,assets=[]){
    const refs=this.referenced(project),stored=new Map(),live=new Map();
    for(const asset of Array.isArray(project?.assets)?project.assets:[]){const key=this.idKey(asset?.id);if(key!==null&&!stored.has(key))stored.set(key,asset)}
    for(const asset of Array.isArray(assets)?assets:[]){const key=this.idKey(asset?.id);if(key===null)continue;if(live.has(key))throw new Error(`Identificador de medio duplicado o ambiguo: ${String(asset.id)}`);live.set(key,asset)}
    const media=[];
    for(const [key,rawId] of refs){
      const previous=this.assetMeta(stored.get(key)||{id:rawId})||{id:rawId},current=this.assetMeta(live.get(key)||{id:rawId})||{id:rawId};
      media.push({...previous,...current,id:current.id??previous.id??rawId});
    }
    const copy=structuredClone(project||{});delete copy.libraryId;copy.assets=media;return copy;
  }
  static normalize(raw,current={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Proyecto JSON inválido');
    const source=raw.kind==='profitmente-studio-project'&&raw.project&&typeof raw.project==='object'?raw.project:raw;
    const duration=Number(source.duration??current.duration??45);
    if(!Number.isFinite(duration)||duration<=0)throw new Error('Duración de proyecto inválida');
    const format=['9:16','16:9','1:1'].includes(source.format)?source.format:(current.format||'9:16');
    const clips=Array.isArray(source.clips)?source.clips:[];
    const assets=Array.isArray(source.assets)?source.assets.map(a=>this.assetMeta(a)).filter(Boolean):[];
    const out={...current,...source,duration,format,clips,assets};delete out.libraryId;return out;
  }
}
if(typeof window!=='undefined')window.ProfitMenteProjectPortability=ProfitMenteProjectPortability;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectPortability;

(function integrateProjectPortability(){
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined')return;
  const exportBtn=document.querySelector('#exportBtn');
  if(!exportBtn)return;
  exportBtn.onclick=()=>{
    try{
      save();
      const clean=ProfitMenteProjectPortability.serialize(project,assets),blob=new Blob([JSON.stringify(clean,null,2)],{type:'application/json'}),a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download=(project.name||'profitmente')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);
      setStatus?.(`Proyecto JSON exportado · ${clean.assets.length} medio(s) referenciado(s) con metadata de reconexión`);
    }catch(err){console.error(err);setStatus?.('No se pudo exportar el proyecto: '+(err?.message||err))}
  };
  // Importar JSON queda exclusivamente en project-import-integration.js.
  // No se reasigna projectInput.onchange aquí: así se conserva el guardado
  // previo, validación estricta, migración y autoguardado del motor moderno.
})();
