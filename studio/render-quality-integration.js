(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteRenderQualityEngine==='undefined')return;
  const engine=ProfitMenteRenderQualityEngine,renderBtn=document.querySelector('#renderMp4Btn');
  if(!renderBtn)return;
  let select=document.querySelector('#renderQuality');
  if(!select){
    const wrap=document.createElement('label');wrap.id='renderQualityControl';wrap.className='renderQualityControl';wrap.title='Calidad del MP4 local';
    select=document.createElement('select');select.id='renderQuality';select.setAttribute('aria-label','Calidad MP4');
    for(const preset of Object.values(engine.presets())){const o=document.createElement('option');o.value=preset.id;o.textContent=`MP4 ${preset.label}`;o.title=preset.description;select.appendChild(o)}
    wrap.appendChild(select);renderBtn.insertAdjacentElement('beforebegin',wrap);
  }
  function current(){return engine.normalize(project?.renderQuality||'high')}
  function sync(){select.value=current();const p=engine.resolve(select.value);select.title=`${p.description} · H.264 CRF ${p.crf} · AAC ${p.audioBitrate}`}
  select.onchange=()=>{
    const p=engine.apply(project,select.value);select.value=p.id;select.title=`${p.description} · H.264 CRF ${p.crf} · AAC ${p.audioBitrate}`;
    if(typeof persist==='function')persist();
    if(typeof setStatus==='function')setStatus(`Calidad MP4: ${p.label} · $0 local`);
    document.dispatchEvent(new CustomEvent('profitmente:render-quality',{detail:{quality:p.id,preset:p}}));
  };
  document.addEventListener('profitmente:project-switched',sync);
  document.addEventListener('profitmente:project-imported',sync);
  sync();
  window.ProfitMenteRenderQuality={engine,select,sync,get value(){return current()},set(value){engine.apply(project,value);sync();if(typeof persist==='function')persist();return engine.resolve(value)}};
})();
