class ProfitMenteProjectPortability{
  static assetMeta(asset={}){
    const keys=['id','name','type','mime','size','duration','width','height','metadataVersion'];
    const out={};for(const k of keys) if(asset[k]!==undefined&&asset[k]!==null) out[k]=asset[k];return out;
  }
  static serialize(project,assets=[]){
    const merged=new Map();
    for(const asset of project?.assets||[]){const meta=this.assetMeta(asset);if(meta.id)merged.set(meta.id,meta)}
    for(const asset of assets||[]){const meta=this.assetMeta(asset);if(meta.id)merged.set(meta.id,{...(merged.get(meta.id)||{}),...meta})}
    return {...project,assets:[...merged.values()]};
  }
  static normalize(raw,current={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw new Error('Proyecto JSON inválido');
    const duration=Number(raw.duration??current.duration??45);
    if(!Number.isFinite(duration)||duration<=0) throw new Error('Duración de proyecto inválida');
    const format=['9:16','16:9','1:1'].includes(raw.format)?raw.format:(current.format||'9:16');
    const clips=Array.isArray(raw.clips)?raw.clips:[];
    const assets=Array.isArray(raw.assets)?raw.assets.map(a=>this.assetMeta(a)).filter(a=>a.id):[];
    return {...current,...raw,duration,format,clips,assets};
  }
}
if(typeof window!=='undefined')window.ProfitMenteProjectPortability=ProfitMenteProjectPortability;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectPortability;

(function integrateProjectPortability(){
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined')return;
  const exportBtn=document.querySelector('#exportBtn'),projectInput=document.querySelector('#projectInput');
  if(exportBtn) exportBtn.onclick=()=>{
    save();
    const clean=ProfitMenteProjectPortability.serialize(project,assets),blob=new Blob([JSON.stringify(clean,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=(project.name||'profitmente')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);
    setStatus?.(`Proyecto JSON exportado · ${clean.assets.length} medios referenciados con metadata`);
  };
  if(projectInput) projectInput.onchange=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{
      const raw=JSON.parse(await f.text()),next=ProfitMenteProjectPortability.normalize(raw,project);
      project=next;save();historyEngine?.seed?.(project);updateHistoryButtons?.();
      setStatus?.(`Proyecto importado · ${project.clips.length} clips · metadata de ${project.assets?.length||0} medios conservada`);
    }catch(err){console.error(err);setStatus?.(err?.message||'JSON inválido')}
    finally{e.target.value=''}
  };
})();
