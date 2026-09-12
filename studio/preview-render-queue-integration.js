(()=>{
  if(!globalThis.ProfitMentePreviewRenderQueue||typeof renderAt!=='function')return;
  const baseRenderAt=renderAt;
  const queue=new globalThis.ProfitMentePreviewRenderQueue(baseRenderAt);
  renderAt=time=>queue.request(time);
  globalThis.ProfitMentePreviewRenderQueueRuntime=queue;
})();
