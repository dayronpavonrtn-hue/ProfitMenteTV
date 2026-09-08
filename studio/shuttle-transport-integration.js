(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteShuttleTransportEngine||window.ProfitMenteShuttleTransport)return;
  const E=window.ProfitMenteShuttleTransportEngine,$=s=>document.querySelector(s);
  let rate=0,raf=0,last=0,custom=false;
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||!!document.activeElement?.isContentEditable}
  function nativePlaying(){return !!$('#playBtn')?.textContent?.includes('⏸')}
  function stopNative(){if(nativePlaying())$('#playBtn')?.click()}
  function stopCustom(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;custom=false}
  function duration(){return E.duration(project?.duration,1)}
  function current(){return E.clampTime($('#playhead')?.value,duration(),0)}
  function status(){
    if(rate===0)setStatus?.('Transporte detenido · J atrás · K pausa · L adelante');
    else if(rate===1)setStatus?.('Reproducción 1× · J/K/L activos');
    else setStatus?.(`Shuttle ${rate>0?'+':''}${rate}× · audio silenciado durante búsqueda rápida`);
  }
  function renderStep(time){
    const slider=$('#playhead');if(!slider)return;
    slider.value=time;syncForm?.();renderAt?.(time);
  }
  function tick(now){
    if(!custom||rate===0)return;
    if(!last)last=now;
    const elapsed=Math.max(0,(now-last)/1000);last=now;
    const result=E.advance(current(),elapsed,rate,duration());
    renderStep(result.time);
    if(result.ended){rate=0;stopCustom();status();return}
    raf=requestAnimationFrame(tick);
  }
  function startCustom(next){
    stopNative();stopCustom();rate=next;custom=true;last=0;raf=requestAnimationFrame(tick);status();
  }
  function apply(key){
    const next=E.nextRate(rate,key);
    if(key==='K'){
      stopNative();stopCustom();rate=0;status();return rate;
    }
    if(next===1){
      stopCustom();rate=1;
      if(!nativePlaying())$('#playBtn')?.click();
      status();return rate;
    }
    startCustom(next);return rate;
  }
  document.addEventListener('keydown',event=>{
    if(typing()||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const key=event.key?.toUpperCase();if(!['J','K','L'].includes(key))return;
    event.preventDefault();apply(key);
  });
  $('#playBtn')?.addEventListener('click',()=>{
    queueMicrotask(()=>{
      if(custom)return;
      rate=nativePlaying()?1:0;
    });
  });
  window.addEventListener('blur',()=>{if(custom)apply('K')});
  window.ProfitMenteShuttleTransport={engine:E,apply,get rate(){return rate},stop:()=>apply('K')};
})();
