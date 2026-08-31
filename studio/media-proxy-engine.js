class ProfitMenteMediaProxyEngine{
  static thresholdBytes=24*1024*1024;
  static extension(name=''){const m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''}
  static shouldProxy(asset={}){
    if(asset?.proxyAutoDisabled)return false;
    if(asset?.type!=='video'||!(asset?.blob instanceof Blob))return false;
    const ext=this.extension(asset.name||''),size=Number(asset.blob.size||asset.size||0),w=Number(asset.width||0),h=Number(asset.height||0);
    return ['mov','mkv','avi'].includes(ext)||size>=this.thresholdBytes||w>1280||h>1280;
  }
  static proxyCurrent(asset={}){
    return asset?.previewBlob instanceof Blob&&asset.previewBlob.size>0&&String(asset.proxySourceFingerprint||'')===String(asset.sourceFingerprint||'');
  }
  static async createProxy(asset={},fetchImpl=globalThis.fetch){
    if(!this.shouldProxy(asset)||this.proxyCurrent(asset)||typeof fetchImpl!=='function')return null;
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),15*60*1000):null;
    try{
      const response=await fetchImpl('/api/media/proxy',{method:'POST',headers:{'Content-Type':asset.mime||asset.blob.type||'application/octet-stream','X-ProfitMente-Filename':encodeURIComponent(asset.name||'video')},body:asset.blob,signal:controller?.signal});
      if(!response.ok){let detail=`HTTP ${response.status}`;try{const data=await response.json();detail=data.error||detail}catch{}throw new Error(detail)}
      const proxy=await response.blob();if(!proxy.size)throw new Error('El proxy local llegó vacío.');return proxy;
    }finally{if(timer)clearTimeout(timer)}
  }
  static async prepare(asset={},options={}){
    const proxy=await this.createProxy(asset,options.fetchImpl||globalThis.fetch);if(!proxy)return false;
    asset.previewBlob=proxy;asset.previewMime='video/mp4';asset.proxySourceFingerprint=String(asset.sourceFingerprint||'');asset.proxySize=proxy.size;asset.proxyGeneratedAt=Date.now();delete asset.proxyAutoDisabled;
    if(typeof options.persist==='function')await options.persist(asset);
    return true;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaProxyEngine=ProfitMenteMediaProxyEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaProxyEngine;

(function integrateMediaProxies(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function')return;
  const engine=ProfitMenteMediaProxyEngine;let chain=Promise.resolve();
  async function prepareAsset(asset){
    if(!engine.shouldProxy(asset)||engine.proxyCurrent(asset))return false;
    try{
      const changed=await engine.prepare(asset,{persist:putAsset});
      if(!changed)return false;
      window.ProfitMentePreviewEngine?.clearCache?.();
      const t=Number(document.querySelector('#playhead')?.value||0);if(typeof renderAt==='function')renderAt(t);
      document.dispatchEvent(new CustomEvent('profitmente:media-proxy-ready',{detail:{assetId:asset.id,size:asset.proxySize}}));
      setStatus?.(`Proxy local listo para ${asset.name} · preview más ligero, original conservado para render`);
      return true;
    }catch(err){console.warn('Proxy local no disponible para',asset?.name,err);return false}
  }
  function enqueue(ids=[]){
    const requested=new Set(ids||[]);const list=(assets||[]).filter(a=>(!requested.size||requested.has(a.id))&&engine.shouldProxy(a)&&!engine.proxyCurrent(a));
    for(const asset of list)chain=chain.then(()=>prepareAsset(asset));return chain;
  }
  document.addEventListener('profitmente:media-imported',e=>enqueue(e.detail?.assetIds||[]));
  setTimeout(()=>enqueue(),250);
  window.ProfitMenteMediaProxies={engine,enqueue,prepareAsset};
})();
