(async()=>{
  if(typeof document==='undefined'||typeof ProfitMenteRenderQueueEngine==='undefined'||window.ProfitMenteRenderQueue)return;
  const renderBtn=document.querySelector('#renderMp4Btn');
  if(!renderBtn||typeof bundler==='undefined'||typeof ProfitMenteRenderJobClient==='undefined')return;
  async function ensureStorageEngine(){
    if(typeof window.ProfitMenteRenderQueueStorageEngine!=='undefined')return true;
    if([...document.scripts].some(s=>s.src.endsWith('/render-queue-storage-engine.js')||s.src.endsWith('render-queue-storage-engine.js'))){
      for(let i=0;i<40&&typeof window.ProfitMenteRenderQueueStorageEngine==='undefined';i++)await new Promise(r=>setTimeout(r,25));
      return typeof window.ProfitMenteRenderQueueStorageEngine!=='undefined';
    }
    return await new Promise(resolve=>{
      const script=document.createElement('script');script.src='render-queue-storage-engine.js';script.async=false;
      script.onload=()=>resolve(typeof window.ProfitMenteRenderQueueStorageEngine!=='undefined');script.onerror=()=>resolve(false);document.body.appendChild(script);
    });
  }
  await ensureStorageEngine();
  const validation=window.ProfitMenteAsyncRenderValidation||{};
  const queue=new ProfitMenteRenderQueueEngine();
  const LEGACY_QUEUE_STORAGE_KEY='profitmente:studio:render-queue:v1';
  const storage=typeof window.ProfitMenteRenderQueueStorageEngine!=='undefined'?new window.ProfitMenteRenderQueueStorageEngine():null;
  const safeName=name=>String(name||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120);
  async function persistQueue(){
    try{
      const state=queue.exportState();
      if(storage){
        if(!state.items.length)await storage.clear();
        else if(!await storage.save(state))throw new Error('El navegador no pudo conservar los medios de la cola');
        try{localStorage?.removeItem?.(LEGACY_QUEUE_STORAGE_KEY)}catch{}
        return true;
      }
      if(typeof localStorage==='undefined')return false;
      if(!state.items.length)localStorage.removeItem(LEGACY_QUEUE_STORAGE_KEY);
      else localStorage.setItem(LEGACY_QUEUE_STORAGE_KEY,JSON.stringify(state));
      return true;
    }catch(error){console.warn('ProfitMente Studio: no se pudo guardar la cola MP4 local',error);return false}
  }
  async function restoreQueue(){
    try{
      let state=storage?await storage.load():null;
      if(!state&&typeof localStorage!=='undefined'){
        const raw=localStorage.getItem(LEGACY_QUEUE_STORAGE_KEY);if(raw)state=JSON.parse(raw);
      }
      if(!state)return 0;
      const restored=queue.restoreState(state);
      if(!restored){await storage?.clear?.();try{localStorage?.removeItem?.(LEGACY_QUEUE_STORAGE_KEY)}catch{}}
      else await persistQueue();
      return restored;
    }catch(error){
      console.warn('ProfitMente Studio: cola MP4 guardada inválida; se descarta sin bloquear Studio',error);
      try{await storage?.clear?.()}catch{};try{localStorage?.removeItem?.(LEGACY_QUEUE_STORAGE_KEY)}catch{}
      return 0;
    }
  }
  const addBtn=document.createElement('button');addBtn.type='button';addBtn.id='renderQueueAddBtn';addBtn.textContent='+ Cola MP4';addBtn.title='Añade una instantánea del proyecto actual a la cola de render local, incluso mientras otra salida se está procesando';
  const runBtn=document.createElement('button');runBtn.type='button';runBtn.id='renderQueueRunBtn';runBtn.textContent='▶ Procesar cola';runBtn.title='Renderiza en serie las instantáneas pendientes usando el motor local gratuito';
  const cancelBtn=document.createElement('button');cancelBtn.type='button';cancelBtn.id='renderQueueCancelBtn';cancelBtn.textContent='■ Detener cola';cancelBtn.title='Cancela el render activo y las salidas pendientes';cancelBtn.hidden=true;
  const badge=document.createElement('span');badge.id='renderQueueBadge';badge.style.cssText='font-size:11px;opacity:.8;margin-left:6px';
  const panel=document.createElement('details');panel.id='renderQueuePanel';panel.style.cssText='margin:8px 0 0;padding:6px 8px;border:1px solid rgba(127,127,127,.25);border-radius:6px;font-size:12px;max-width:720px';
  const panelSummary=document.createElement('summary');panelSummary.textContent='Gestionar cola MP4';panelSummary.style.cursor='pointer';
  const panelBody=document.createElement('div');panelBody.style.cssText='display:grid;gap:6px;margin-top:8px';panel.append(panelSummary,panelBody);
  for(const button of [addBtn,runBtn,cancelBtn])button.style.cssText='margin-left:6px';
  renderBtn.insertAdjacentElement('afterend',badge);badge.insertAdjacentElement('beforebegin',cancelBtn);cancelBtn.insertAdjacentElement('beforebegin',runBtn);runBtn.insertAdjacentElement('beforebegin',addBtn);badge.insertAdjacentElement('afterend',panel);
  const statusText={pending:'pendiente',running:'renderizando',done:'listo',error:'error',cancelled:'cancelado'};
  function button(text,title,onClick){const el=document.createElement('button');el.type='button';el.textContent=text;el.title=title;el.onclick=onClick;return el}
  function changed(action){const result=action();void persistQueue();label();return result}
  function renderPanel(){
    panelBody.replaceChildren();
    if(!queue.items.length){const empty=document.createElement('div');empty.textContent='No hay trabajos en la cola.';empty.style.opacity='.7';panelBody.appendChild(empty);return}
    const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
    const retryAll=button('↻ Reintentar errores','Devuelve a pendientes todos los renders fallidos, incluso mientras otra salida se procesa',()=>{const n=changed(()=>queue.retryFailed());setStatus?.(n?`${n} render(es) devuelto(s) a pendientes`:'No hay errores para reintentar')});retryAll.disabled=!queue.items.some(item=>item.status==='error');
    const clear=button('Limpiar terminados','Elimina de la lista trabajos listos, fallidos y cancelados sin tocar el render activo',()=>{const n=changed(()=>queue.clearFinished());setStatus?.(n?`${n} trabajo(s) retirado(s) de la cola`:'No hay trabajos terminados para limpiar')});clear.disabled=!queue.items.some(item=>['done','error','cancelled'].includes(item.status));toolbar.append(retryAll,clear);panelBody.appendChild(toolbar);
    const pending=queue.pending();
    for(const item of queue.items){
      const row=document.createElement('div');row.dataset.renderQueueId=item.id;row.style.cssText='display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:8px;align-items:center;padding:6px;border-top:1px solid rgba(127,127,127,.18)';
      const meta=document.createElement('div');const name=document.createElement('strong');name.textContent=item.name;const state=document.createElement('span');state.textContent=` · ${statusText[item.status]||item.status}`;state.style.opacity='.72';meta.append(name,state);
      if(item.error){const err=document.createElement('div');err.textContent=item.error;err.title=item.error;err.style.cssText='opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px';meta.appendChild(err)}
      const order=document.createElement('div');order.style.cssText='display:flex;gap:4px';const pendingPos=pending.findIndex(candidate=>candidate.id===item.id);
      if(item.status==='pending'){const up=button('▲','Subir prioridad mientras la cola continúa',()=>changed(()=>queue.movePending(item.id,-1)));up.disabled=pendingPos<=0;const down=button('▼','Bajar prioridad mientras la cola continúa',()=>changed(()=>queue.movePending(item.id,1)));down.disabled=pendingPos<0||pendingPos>=pending.length-1;order.append(up,down)}
      const actions=document.createElement('div');actions.style.cssText='display:flex;gap:4px';if(['error','cancelled'].includes(item.status)){const retry=button('↻','Reintentar y devolver a pendientes',()=>changed(()=>queue.retry(item.id)));actions.appendChild(retry)}
      const remove=button('✕','Quitar de la cola',()=>{if(changed(()=>queue.remove(item.id)))setStatus?.(`Quitado de cola MP4: ${item.name}`)});remove.disabled=item.status==='running';actions.appendChild(remove);row.append(meta,order,actions);panelBody.appendChild(row);
    }
  }
  function label(){const s=queue.summary();const parts=[];if(s.pending)parts.push(`${s.pending} pendiente(s)`);if(s.running)parts.push('1 renderizando');if(s.done)parts.push(`${s.done} listo(s)`);if(s.error)parts.push(`${s.error} error(es)`);if(s.cancelled)parts.push(`${s.cancelled} cancelado(s)`);badge.textContent=parts.length?`Cola: ${parts.join(' · ')}`:'Cola vacía';panelSummary.textContent=`Gestionar cola MP4 (${s.total})`;runBtn.disabled=queue.running||s.pending===0;addBtn.disabled=false;cancelBtn.hidden=!queue.running;renderBtn.disabled=queue.running;renderPanel()}
  function capture(){if(typeof save==='function')save();const prepared=typeof ProfitMenteAudioDuckingEngine!=='undefined'?ProfitMenteAudioDuckingEngine.prepareForRender(project):project;const renderProject=typeof ProfitMenteRenderSnapshotEngine!=='undefined'&&typeof ProfitMenteRenderSnapshotEngine.clone==='function'?ProfitMenteRenderSnapshotEngine.clone(prepared):prepared;const renderAssets=typeof validation.snapshotAssetsForRender==='function'?validation.snapshotAssetsForRender(assets):assets;return {renderProject,renderAssets}}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(name)}.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return Number(blob.size)||0}
  async function preflight(item){if(typeof validation.renderPreflight==='function')return validation.renderPreflight(item.project,item.assets);if(typeof window.ProfitMenteExportPreflightRun==='function'){const result=await window.ProfitMenteExportPreflightRun({project:item.project,assets:item.assets});return {ok:!!result?.canRender,preflight:result}}return {ok:true,preflight:null}}
  async function renderItem(item,signal,progress){
    const gate=await preflight(item);if(!gate?.ok)throw new Error('Preflight bloqueó esta salida: corrige los errores de QA y vuelve a encolarla.');const health=gate.preflight?.health||await bundler.health();if(!health?.ok)throw new Error('Abre Studio con start_studio_windows.bat para activar el render MP4 directo.');if(!health?.render_ready)throw new Error('FFmpeg y FFprobe no están disponibles. Instala FFmpeg gratis y vuelve a abrir Studio.');
    progress({phase:'packaging',progress:0});const bundle=await bundler.build(item.project,item.assets);if(signal.aborted)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});const client=new ProfitMenteRenderJobClient();let cancelRequested=false;const onAbort=()=>{cancelRequested=true;client.cancel().catch(()=>{})};signal.addEventListener('abort',onAbort,{once:true});
    try{progress({phase:'uploading',progress:0,bytes:bundle.size});await client.start(bundle);if(cancelRequested||signal.aborted){await client.cancel().catch(()=>{});throw Object.assign(new Error('Render cancelado'),{name:'AbortError'})}const finalState=await client.wait(state=>progress(state));if(typeof validation.validatePostRender==='function')validation.validatePostRender(finalState);progress({phase:'downloading',progress:100});const blob=await client.result({onRetry:event=>progress({status:'retrying-download',...event})});if(signal.aborted)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});const bytes=download(blob,item.name);return {bytes,qc:finalState?.qc||null}}finally{signal.removeEventListener('abort',onAbort);client.reset()}
  }
  function updateStatus(item,summary){void persistQueue();label();if(!item)return;if(item.status==='running'){const p=Number.isFinite(Number(item.progress?.progress))?` ${Math.round(Number(item.progress.progress))}%`:'';const phase=String(item.progress?.phase||item.progress?.status||'renderizando');setStatus?.(`Cola MP4 · ${item.name} · ${phase}${p}`)}else if(item.status==='done')setStatus?.(`Cola MP4 · ${item.name} terminado · quedan ${summary.pending} pendiente(s)`);else if(item.status==='error')setStatus?.(`Cola MP4 · ${item.name} falló: ${item.error}`);else if(item.status==='cancelled')setStatus?.('Cola MP4 detenida')}
  function enqueueCurrent(){const {renderProject,renderAssets}=capture();const item=queue.enqueue(renderProject,renderAssets,{name:renderProject?.name||project?.name||'profitmente'});void persistQueue();label();setStatus?.(`Añadido a cola MP4: ${item.name} · snapshot independiente${queue.running?' · se procesará al terminar la salida actual':''}`);return item}
  async function run(){if(queue.running)return queue.summary();if(!queue.pending().length){setStatus?.('La cola MP4 está vacía');return queue.summary()}label();try{return await queue.run(renderItem,{continueOnError:true,onUpdate:updateStatus})}finally{await persistQueue();label()}}
  addBtn.onclick=()=>{try{enqueueCurrent()}catch(err){console.error(err);setStatus?.(err?.message||String(err))}};runBtn.onclick=()=>{run().catch(err=>{console.error(err);setStatus?.(`No se pudo procesar la cola MP4: ${err?.message||err}`)})};cancelBtn.onclick=()=>{queue.cancel({cancelPending:true});void persistQueue();label();setStatus?.('Deteniendo cola MP4…')};
  window.addEventListener?.('pagehide',()=>{void persistQueue()});label();
  const ready=restoreQueue().then(restoredCount=>{label();if(restoredCount)setStatus?.(`Cola MP4 recuperada: ${restoredCount} trabajo(s) con sus medios locales. Los renders interrumpidos requieren reintento.`);return restoredCount});
  window.ProfitMenteRenderQueue={queue,enqueueCurrent,run,cancel:()=>{const n=queue.cancel({cancelPending:true});void persistQueue();return n},renderItem,preflight,refresh:label,persist:persistQueue,storageKey:LEGACY_QUEUE_STORAGE_KEY,storage,ready};
})();
