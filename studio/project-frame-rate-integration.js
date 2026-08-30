(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteProjectFrameRateEngine==='undefined'||window.ProfitMenteProjectFrameRate)return;
  const engine=ProfitMenteProjectFrameRateEngine;
  const props=document.querySelector('.props');if(!props)return;
  let select=document.querySelector('#projectFps');
  if(!select){
    const label=document.createElement('label');label.textContent='Fotogramas por segundo';
    select=document.createElement('select');select.id='projectFps';select.innerHTML='<option value="24">24 FPS · Cine</option><option value="30">30 FPS · Estándar</option><option value="60">60 FPS · Fluido</option>';label.appendChild(select);
    const format=document.querySelector('#format')?.closest('label');format?.insertAdjacentElement('afterend',label)||props.appendChild(label);
  }
  project.fps=engine.normalize(project.fps);
  function value(){return engine.normalize(project?.fps)}
  function sync(){
    const fps=value();select.value=String(fps);
    const meta=document.querySelector('#previewMeta');
    if(meta&&meta.textContent&&!/\b(?:24|30|60) FPS\b/.test(meta.textContent))meta.textContent+=` · ${fps} FPS`;
    return fps;
  }
  if(typeof syncForm==='function'){
    const previousSync=syncForm;
    syncForm=function(){const out=previousSync.apply(this,arguments);sync();return out};
  }
  select.addEventListener('change',()=>{
    const fps=engine.apply(project,select.value);persist?.();sync();
    window.dispatchEvent(new CustomEvent('profitmente:framerate',{detail:{fps}}));
    setStatus?.(`Proyecto configurado a ${fps} FPS · preview y exportación sincronizados`);
  });
  sync();
  window.ProfitMenteProjectFrameRate={engine,get fps(){return value()},set fps(v){const fps=engine.apply(project,v);select.value=String(fps);sync();return fps},sync};
})();
