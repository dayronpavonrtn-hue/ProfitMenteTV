(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteMediaMetadataEngine{
    static finitePositive(value){
      if(typeof value==='boolean'||Array.isArray(value)||value===null||value===undefined||value==='')return null;
      const n=Number(value);return Number.isFinite(n)&&n>0?n:null;
    }
    static kind(asset={}){
      const direct=typeof asset?.type==='string'?asset.type.trim().toLowerCase():'';
      if(['video','audio','image'].includes(direct))return direct;
      const mime=typeof asset?.mime==='string'?asset.mime.trim().toLowerCase():'';
      const top=mime.split('/')[0];return ['video','audio','image'].includes(top)?top:null;
    }
    static metadataFromElement(kind,element={}){
      const type=String(kind||'').toLowerCase(),out={};
      if(type==='video'||type==='audio'){
        const duration=this.finitePositive(element.duration);if(duration!==null)out.duration=+duration.toFixed(6);
      }
      if(type==='video'){
        const width=this.finitePositive(element.videoWidth),height=this.finitePositive(element.videoHeight);
        if(width!==null&&height!==null){out.width=Math.round(width);out.height=Math.round(height)}
      }else if(type==='image'){
        const width=this.finitePositive(element.naturalWidth??element.width),height=this.finitePositive(element.naturalHeight??element.height);
        if(width!==null&&height!==null){out.width=Math.round(width);out.height=Math.round(height)}
      }
      return out;
    }
    static needsProbe(asset={}){
      const type=this.kind(asset);if(!type)return false;
      const width=this.finitePositive(asset.width),height=this.finitePositive(asset.height),duration=this.finitePositive(asset.duration);
      if(type==='image')return width===null||height===null;
      if(type==='audio')return duration===null;
      return duration===null||width===null||height===null;
    }
    static merge(asset={},metadata={}){
      const next={...asset};let changed=false;
      for(const key of ['duration','width','height']){
        const value=this.finitePositive(metadata?.[key]);if(value===null)continue;
        const normalized=key==='duration'?+value.toFixed(6):Math.round(value);
        if(next[key]!==normalized){next[key]=normalized;changed=true}
      }
      if(changed){next.metadataVersion=1;next.metadataProbedAt=new Date().toISOString()}
      return {asset:next,changed};
    }
    static async probeAsset(asset={},options={}){
      const type=this.kind(asset),blob=asset?.blob;
      if(!type||!(blob instanceof Blob))throw new Error('Medio local no disponible para inspección');
      if(typeof document==='undefined'||!root.URL?.createObjectURL)throw new Error('Inspección de medios no disponible en este entorno');
      const timeoutMs=Math.max(1000,Math.min(30000,Number(options.timeoutMs)||8000)),url=root.URL.createObjectURL(blob);
      try{
        if(type==='image')return await new Promise((resolve,reject)=>{
          const image=new Image(),timer=setTimeout(()=>{cleanup();reject(new Error('Tiempo agotado leyendo la imagen'))},timeoutMs);
          const cleanup=()=>{clearTimeout(timer);image.onload=null;image.onerror=null};
          image.onload=()=>{const metadata=this.metadataFromElement(type,image);cleanup();resolve(metadata)};
          image.onerror=()=>{cleanup();reject(new Error('No se pudo leer la imagen'))};image.src=url;
        });
        return await new Promise((resolve,reject)=>{
          const media=document.createElement(type==='video'?'video':'audio'),timer=setTimeout(()=>{cleanup();reject(new Error('Tiempo agotado leyendo el medio'))},timeoutMs);
          const cleanup=()=>{clearTimeout(timer);media.onloadedmetadata=null;media.onerror=null;try{media.removeAttribute('src');media.load?.()}catch{}};
          media.preload='metadata';media.onloadedmetadata=()=>{const metadata=this.metadataFromElement(type,media);cleanup();resolve(metadata)};
          media.onerror=()=>{cleanup();reject(new Error('No se pudo leer la metadata del medio'))};media.src=url;media.load?.();
        });
      }finally{root.URL.revokeObjectURL(url)}
    }
  }
  root.ProfitMenteMediaMetadataEngine=ProfitMenteMediaMetadataEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaMetadataEngine;

  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function')return;
  const pending=new Map();
  async function enrich(asset){
    if(!asset||!ProfitMenteMediaMetadataEngine.needsProbe(asset))return {changed:false,asset};
    const key=String(asset.id??asset.name??'');if(pending.has(key))return pending.get(key);
    const task=(async()=>{
      try{
        const metadata=await ProfitMenteMediaMetadataEngine.probeAsset(asset),merged=ProfitMenteMediaMetadataEngine.merge(asset,metadata);
        if(!merged.changed)return merged;
        Object.assign(asset,merged.asset);await putAsset(asset);
        document.dispatchEvent(new CustomEvent('profitmente:media-metadata',{detail:{assetId:asset.id,metadata}}));
        return {changed:true,asset,metadata};
      }catch(error){console.warn('No se pudo inspeccionar metadata local',asset?.name||asset?.id,error);return {changed:false,asset,error}}
      finally{pending.delete(key)}
    })();pending.set(key,task);return task;
  }
  async function enrichMany(list){for(const asset of list||[])await enrich(asset)}
  document.addEventListener('profitmente:media-imported',event=>{
    const ids=new Set(Array.from(event?.detail?.assetIds||[],String));void enrichMany(assets.filter(asset=>ids.has(String(asset?.id))));
  });
  queueMicrotask(()=>void enrichMany(assets));
  root.ProfitMenteMediaMetadata={engine:ProfitMenteMediaMetadataEngine,enrich,enrichMany,pending};
})();
