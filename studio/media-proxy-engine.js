class ProfitMenteMediaProxyEngine{
  static thresholdBytes=24*1024*1024;
  static extension(name=''){const m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''}
  static mediaKey(value){
    if(value==null||typeof value==='boolean')return null;
    const text=String(value).trim();
    if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const number=Number(text);
      if(Number.isFinite(number))return `n:${number}`;
    }
    return `s:${text}`;
  }
  static requestedKeys(ids=[]){return new Set((Array.isArray(ids)?ids:[]).map(id=>this.mediaKey(id)).filter(key=>key!=null))}
  static candidates(allAssets=[],ids=[]){
    const list=Array.isArray(allAssets)?allAssets:[],rawIds=Array.isArray(ids)?ids:[],requested=this.requestedKeys(rawIds),filterByIds=rawIds.length>0;
    return list.filter(asset=>(!filterByIds||requested.has(this.mediaKey(asset?.id)))&&this.shouldProxy(asset)&&!this.proxyCurrent(asset));
  }
  static shouldProxy(asset={}){
    if(asset?.proxyAutoDisabled)return false;
    if(asset?.type!=='video'||!(asset?.blob instanceof Blob))return false;
    const ext=this.extension(asset.name||''),size=Number(asset.blob.size||asset.size||0),w=Number(asset.width||0),h=Number(asset.height||0);
    return ['mov','mkv','avi'].includes(ext)||size>=this.thresholdBytes||w>1280||h>1280;
  }
  static proxyCurrent(asset={}){
    return asset?.previewBlob instanceof Blob&&asset.previewBlob.size>0&&String(asset.proxySourceFingerprint||'')===String(asset.sourceFingerprint||'');
  }
  static status(asset={}){
    if(asset?.type!=='video')return 'not-video';
    if(asset?.proxyStatus==='generating')return 'generating';
    if(asset?.proxyStatus==='error')return 'error';
    if(asset?.proxyAutoDisabled)return 'disabled';
    if(this.proxyCurrent(asset))return 'ready';
    return this.shouldProxy(asset)?'pending':'not-needed';
  }
  static clearProxy(asset={},suppress=false){
    if(!asset||typeof asset!=='object')return false;
    const had=asset.previewBlob instanceof Blob||asset.proxySize!=null||asset.proxySourceFingerprint!=null;
    delete asset.previewBlob;delete asset.previewMime;delete asset.proxySourceFingerprint;delete asset.proxySize;delete asset.proxyGeneratedAt;delete asset.proxyError;delete asset.proxyStatus;
    if(suppress)asset.proxyAutoDisabled=true;else delete asset.proxyAutoDisabled;
    return had;
  }
  static async createProxy(asset={},fetchImpl=globalThis.fetch,options={}){
    const force=options?.force===true;
    if((!force&&!this.shouldProxy(asset))||this.proxyCurrent(asset)||typeof fetchImpl!=='function')return null;
    if(asset?.type!=='video'||!(asset?.blob instanceof Blob)||asset.proxyAutoDisabled&&!force)return null;
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),15*60*1000):null;
    try{
      const response=await fetchImpl('/api/media/proxy',{method:'POST',headers:{'Content-Type':asset.mime||asset.blob.type||'application/octet-stream','X-ProfitMente-Filename':encodeURIComponent(asset.name||'video')},body:asset.blob,signal:controller?.signal});
      if(!response.ok){let detail=`HTTP ${response.status}`;try{const data=await response.json();detail=data.error||detail}catch{}throw new Error(detail)}
      const proxy=await response.blob();if(!proxy.size)throw new Error('El proxy local llegó vacío.');return proxy;
    }finally{if(timer)clearTimeout(timer)}
  }
  static async prepare(asset={},options={}){
    if(!asset||typeof asset!=='object')return false;
    const force=options.force===true;
    if(this.proxyCurrent(asset)&&!force)return false;
    if(force)this.clearProxy(asset,false);
    asset.proxyStatus='generating';delete asset.proxyError;
    try{
      const proxy=await this.createProxy(asset,options.fetchImpl||globalThis.fetch,{force});
      if(!proxy){delete asset.proxyStatus;return false}
      asset.previewBlob=proxy;asset.previewMime='video/mp4';asset.proxySourceFingerprint=String(asset.sourceFingerprint||'');asset.proxySize=proxy.size;asset.proxyGeneratedAt=Date.now();asset.proxyStatus='ready';delete asset.proxyAutoDisabled;delete asset.proxyError;
      if(typeof options.persist==='function')await options.persist(asset);
      return true;
    }catch(error){asset.proxyStatus='error';asset.proxyError=String(error?.message||error||'No se pudo generar el proxy');if(typeof options.persist==='function')await options.persist(asset);throw error}
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaProxyEngine=ProfitMenteMediaProxyEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaProxyEngine;

(function integrateMediaProxies(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function')return;
  const engine=ProfitMenteMediaProxyEngine;let chain=Promise.resolve();
  function emit(asset){document.dispatchEvent(new CustomEvent('profitmente:media-proxy-status',{detail:{assetId:asset?.id,status:engine.status(asset),size:asset?.proxySize||0,error:asset?.proxyError||''}}))}
  async function prepareAsset(asset,options={}){
    const force=options.force===true;
    if(!force&&(!engine.shouldProxy(asset)||engine.proxyCurrent(asset)))return false;
    try{
      asset.proxyStatus='generating';delete asset.proxyError;emit(asset);
      const changed=await engine.prepare(asset,{persist:putAsset,force});
      if(!changed){emit(asset);return false}
      window.ProfitMentePreviewEngine?.clearCache?.();
      const t=Number(document.querySelector('#playhead')?.value||0);if(typeof renderAt==='function')renderAt(t);
      emit(asset);document.dispatchEvent(new CustomEvent('profitmente:media-proxy-ready',{detail:{assetId:asset.id,size:asset.proxySize}}));
      setStatus?.(`Proxy local listo para ${asset.name} · preview más ligero, original conservado para render`);
      return true;
    }catch(err){console.warn('Proxy local no disponible para',asset?.name,err);emit(asset);return false}
  }
  function enqueue(ids=[]){
    const list=engine.candidates(assets,ids);
    for(const asset of list)chain=chain.then(()=>prepareAsset(asset));return chain;
  }
  async function disableAsset(asset){
    if(!asset||asset.type!=='video')return false;engine.clearProxy(asset,true);await putAsset(asset);window.ProfitMentePreviewEngine?.clearCache?.();emit(asset);return true
  }
  async function enableAsset(asset,{rebuild=true}={}){
    if(!asset||asset.type!=='video')return false;delete asset.proxyAutoDisabled;delete asset.proxyError;delete asset.proxyStatus;await putAsset(asset);emit(asset);return rebuild?prepareAsset(asset,{force:true}):true
  }
  async function rebuildAsset(asset){
    if(!asset||asset.type!=='video')return false;delete asset.proxyAutoDisabled;return prepareAsset(asset,{force:true})
  }
  document.addEventListener('profitmente:media-imported',e=>enqueue(e.detail?.assetIds||[]));
  setTimeout(()=>enqueue(),250);
  window.ProfitMenteMediaProxies={engine,enqueue,prepareAsset,disableAsset,enableAsset,rebuildAsset,status:asset=>engine.status(asset)};
})();
