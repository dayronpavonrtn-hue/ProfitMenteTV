(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteRenderQueueEngine==='undefined'||window.ProfitMenteRenderQueue)return;
  const renderBtn=document.querySelector('#renderMp4Btn');
  if(!renderBtn||typeof bundler==='undefined'||typeof ProfitMenteRenderJobClient==='undefined')return;
  const validation=window.ProfitMenteAsyncRenderValidation||{};
  const queue=new ProfitMenteRenderQueueEngine();
  const safeName=name=>String(name||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120);
  const addBtn=document.createElement('button');addBtn.type='button';addBtn.id='renderQueueAddBtn';addBtn.textContent='+ Cola MP4';addBtn.title='Añade una instantánea del proyecto actual a la cola de render local';
  const runBtn=document.createElement('button');runBtn.type='button';runBtn.id='renderQueueRunBtn';runBtn.textContent='▶ Procesar cola';runBtn.title='Renderiza en serie las instantáneas pendientes usando el motor local gratuito';
  const cancelBtn=document.createElement('button');cancelBtn.type='button';cancelBtn.id='renderQueueCancelBtn';cancelBtn.textContent='■ Detener cola';cancelBtn.title='Cancela el render activo y las salidas pendientes';cancelBtn.hidden=true;
  const badge=document.createElement('span');badge.id='renderQueueBadge';badge.style.cssText='font-size:11px;opacity:.8;margin-left:6px';
  for(const button of [addBtn,runBtn,cancelBtn])button.style.cssText='margin-left:6px';
  renderBtn.insertAdjacentElement('afterend',badge);badge.insertAdjacentElement('beforebegin',cancelBtn);cancelBtn.insertAdjacentElement('beforebegin',runBtn);runBtn.insertAdjacentElement('beforebegin',addBtn);
  function label(){const s=queue.summary();const parts=[];if(s.pending)parts.push(`${s.pending} pendiente(s)`);if(s.running)parts.push('1 renderizando');if(s.done)parts.push(`${s.done} listo(s)`);if(s.error)parts.push(`${s.error} error(es)`);if(s.cancelled)parts.push(`${s.cancelled} cancelado(s)`);badge.textContent=parts.length?`Cola: ${parts.join(' · ')}`:'Cola vacía';runBtn.disabled=queue.running||s.pending===0;addBtn.disabled=queue.running;cancelBtn.hidden=!queue.running;renderBtn.disabled=queue.running}
  function capture(){
    save?.();
    const renderProject=typeof validation.projectForRender==='function'?validation.projectForRender(project):project;
    const renderAssets=typeof validation.snapshotAssetsForRender==='function'?validation.snapshotAssetsForRender(assets):assets;
    return {renderProject,renderAssets};
  }
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(name)}.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return Number(blob.size)||0}
  async function preflight(item){
    if(typeof validation.renderPreflight==='function')return validation.renderPreflight(item.project,item.assets);
    if(typeof window.ProfitMenteExportPreflightRun==='function'){
      const result=await window.ProfitMenteExportPreflightRun({project:item.project,assets:item.assets});
      return {ok:!!result?.canRender,preflight:result};
    }
    return {ok:true,preflight:null};
  }
  async function renderItem(item,signal,progress){
    const gate=await preflight(item);if(!gate?.ok)throw new Error('Preflight bloqueó esta salida: corrige los errores de QA y vuelve a encolarla.');
    const health=gate.preflight?.health||await bundler.health();
    if(!health?.ok)throw new Error('Abre Studio con start_studio_windows.bat para activar el render MP4 directo.');
    if(!health?.render_ready)throw new Error('FFmpeg y FFprobe no están disponibles. Instala FFmpeg gratis y vuelve a abrir Studio.');
    progress({phase:'packaging',progress:0});
    const bundle=await bundler.build(item.project,item.assets);if(signal.aborted)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
    const client=new ProfitMenteRenderJobClient();
    let cancelRequested=false;
    const onAbort=()=>{cancelRequested=true;client.cancel().catch(()=>{})};signal.addEventListener('abort',onAbort,{once:true});
    try{
      progress({phase:'uploading',progress:0,bytes:bundle.size});await client.start(bundle);
      if(cancelRequested||signal.aborted){await client.cancel().catch(()=>{});throw Object.assign(new Error('Render cancelado'),{name:'AbortError'})}
      const finalState=await client.wait(state=>progress(state));
      if(typeof validation.validatePostRender==='function')validation.validatePostRender(finalState);
      progress({phase:'downloading',progress:100});const blob=await client.result({onRetry:event=>progress({status:'retrying-download',...event})});
      if(signal.aborted)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
      const bytes=download(blob,item.name);return {bytes,qc:finalState?.qc||null};
    }finally{signal.removeEventListener('abort',onAbort);client.reset()}
  }
  function updateStatus(item,summary){
    label();
    if(!item)return;
    if(item.status==='running'){
      const p=Number.isFinite(Number(item.progress?.progress))?` ${Math.round(Number(item.progress.progress))}%`:'';
      const phase=String(item.progress?.phase||item.progress?.status||'renderizando');setStatus?.(`Cola MP4 · ${item.name} · ${phase}${p}`);
    }else if(item.status==='done')setStatus?.(`Cola MP4 · ${item.name} terminado · quedan ${summary.pending} pendiente(s)`);
    else if(item.status==='error')setStatus?.(`Cola MP4 · ${item.name} falló: ${item.error}`);
    else if(item.status==='cancelled')setStatus?.('Cola MP4 detenida');
  }
  function enqueueCurrent(){
    if(queue.running)throw new Error('Espera a que termine la cola antes de añadir otra versión');
    const {renderProject,renderAssets}=capture();const item=queue.enqueue(renderProject,renderAssets,{name:renderProject?.name||project?.name||'profitmente'});label();setStatus?.(`Añadido a cola MP4: ${item.name} · snapshot independiente`);return item;
  }
  async function run(){
    if(queue.running)return queue.summary();if(!queue.pending().length){setStatus?.('La cola MP4 está vacía');return queue.summary()}
    label();try{return await queue.run(renderItem,{continueOnError:true,onUpdate:updateStatus})}finally{label()}
  }
  addBtn.onclick=()=>{try{enqueueCurrent()}catch(err){console.error(err);setStatus?.(err?.message||String(err))}};
  runBtn.onclick=()=>{run().catch(err=>{console.error(err);setStatus?.(`No se pudo procesar la cola MP4: ${err?.message||err}`)})};
  cancelBtn.onclick=()=>{queue.cancel({cancelPending:true});label();setStatus?.('Deteniendo cola MP4…')};
  label();
  window.ProfitMenteRenderQueue={queue,enqueueCurrent,run,cancel:()=>queue.cancel({cancelPending:true}),renderItem,preflight};
})();
