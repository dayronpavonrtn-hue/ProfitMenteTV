(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteRenderJobClient==='undefined')return;
  const renderBtn=document.querySelector('#renderMp4Btn');if(!renderBtn)return;
  const client=new ProfitMenteRenderJobClient();
  let cancelBtn=document.querySelector('#cancelRenderBtn');
  if(!cancelBtn){cancelBtn=document.createElement('button');cancelBtn.id='cancelRenderBtn';cancelBtn.type='button';cancelBtn.textContent='■ Cancelar render';cancelBtn.hidden=true;cancelBtn.title='Detener el render MP4 local';renderBtn.insertAdjacentElement('afterend',cancelBtn)}
  const safeName=name=>String(name||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120);
  function statusText(s){const p=Number.isFinite(Number(s.progress))?` · ${Math.max(0,Math.min(100,Math.round(Number(s.progress))))}%`:'';const elapsed=Number(s.elapsed||0)>0?` · ${Math.round(Number(s.elapsed))}s`:'';const label=s.status==='queued'?'En cola':s.status==='rendering'?'Renderizando':s.status==='done'?'Terminado':s.status==='cancelled'?'Cancelado':'Preparando';return `${label}${p}${elapsed}`}
  async function download(blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(project.name)}.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return blob.size}
  renderBtn.onclick=async()=>{
    save();const r=qa.inspect(project,assets);if(r.issues.length){setStatus('Render MP4 bloqueado: corrige primero los errores de QA');document.querySelector('#qaBtn')?.click();return}
    renderBtn.disabled=true;cancelBtn.hidden=false;client.reset();
    try{
      const health=await bundler.health();if(!health.ok)throw new Error('Abre Studio con start_studio_windows.bat para activar el render MP4 directo.');if(!health.render_ready)throw new Error('FFmpeg y FFprobe no están disponibles. Instala FFmpeg gratis y vuelve a abrir Studio.');
      setStatus('Empaquetando proyecto y medios…');const blob=await bundler.build(project,assets);setStatus(`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`);await client.start(blob);
      await client.wait(s=>setStatus(`MP4 local · ${statusText(s)}`));setStatus('MP4 terminado. Preparando descarga…');const mp4=await client.result();const size=await download(mp4);setStatus(`MP4 final descargado · ${(size/1048576).toFixed(1)} MB`);
    }catch(err){if(err?.name==='AbortError'||/cancelado/i.test(err?.message||''))setStatus('Render MP4 cancelado');else{console.error(err);setStatus('No se pudo renderizar MP4: '+(err?.message||err))}}
    finally{renderBtn.disabled=false;cancelBtn.hidden=true;client.reset()}
  };
  cancelBtn.onclick=async()=>{cancelBtn.disabled=true;try{setStatus('Cancelando render local…');await client.cancel()}catch(err){console.warn(err)}finally{cancelBtn.disabled=false}};
  window.profitMenteRenderJobClient=client;
})();
