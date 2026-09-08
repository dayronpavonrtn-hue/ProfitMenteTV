(()=>{
  if(typeof document==='undefined'||!window.ProfitMentePreviewFrameStepEngine||window.ProfitMentePreviewFrameStep)return;
  const E=window.ProfitMentePreviewFrameStepEngine,$=s=>document.querySelector(s);
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
  function pause(){const button=$('#playBtn');if(button&&button.textContent?.includes('⏸'))button.click()}
  function apply(frames){
    const slider=$('#playhead');if(!slider)return null;
    pause();
    const result=E.step(project,slider.value,frames);
    if(!result.ok){setStatus?.('No se pudo mover el preview por fotogramas');return result}
    slider.value=result.time;
    syncForm?.();renderAt?.(result.time);
    setStatus?.(`Preview · frame ${result.frame} · ${result.fps} fps`);
    return result;
  }
  document.addEventListener('keydown',event=>{
    if(typing()||event.ctrlKey||event.metaKey||event.altKey)return;
    let frames=0;
    if(event.code==='Comma')frames=event.shiftKey?-10:-1;
    if(event.code==='Period')frames=event.shiftKey?10:1;
    if(!frames)return;
    event.preventDefault();apply(frames);
  });
  const button=$('#playBtn');
  if(button?.parentElement&&!$('#previewFrameBack')){
    const back=document.createElement('button');back.id='previewFrameBack';back.type='button';back.textContent='⏮ Frame';back.title='Retroceder 1 fotograma (,). Shift+, retrocede 10';back.onclick=()=>apply(-1);
    const next=document.createElement('button');next.id='previewFrameNext';next.type='button';next.textContent='Frame ⏭';next.title='Avanzar 1 fotograma (.). Shift+. avanza 10';next.onclick=()=>apply(1);
    button.parentElement.insertBefore(back,button);button.parentElement.insertBefore(next,button.nextSibling);
  }
  window.ProfitMentePreviewFrameStep={engine:E,step:apply};
})();
