(()=>{
  const envelope=window.ProfitMenteAudioEnvelope?.engine||new ProfitMenteAudioEnvelopeEngine();
  const engine=new ProfitMenteAudioCrossfadeEngine(envelope);
  const wrap=document.querySelector('#ciAudioEnvelopeWrap');
  if(!wrap)return;
  const actions=wrap.querySelector('.ciActions')||wrap;
  const button=document.createElement('button');
  button.id='ciCrossfadeNext';button.type='button';button.textContent='🔀 Crossfade con siguiente';
  actions.appendChild(button);
  const info=document.createElement('small');info.id='ciCrossfadeInfo';wrap.appendChild(info);
  const selected=()=>window.ProfitMenteEditTools?.selectedId??null;
  function plan(){return engine.nextOverlap(project,assets,selected())}
  function draw(){
    const id=selected();
    if(id===null){button.disabled=true;info.textContent='';return}
    const p=plan();button.disabled=!p.ok;
    if(p.ok)info.textContent=`Solape detectado ${p.overlap.toFixed(2)}s · crossfade ${p.duration.toFixed(2)}s`;
    else if(p.reason==='locked')info.textContent='Crossfade bloqueado: desbloquea ambos clips y la pista';
    else if(p.reason==='insufficient-room')info.textContent='Sin espacio útil para crossfade por los fades actuales';
    else info.textContent='Selecciona un clip de audio que se solape con el siguiente';
  }
  button.onclick=()=>{
    const r=engine.applyNext(project,assets,selected());
    if(!r.ok){draw();setStatus?.(r.reason==='locked'?'Crossfade bloqueado por clip o pista':'No hay un solape válido para aplicar crossfade');return}
    persist?.();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);draw();
    setStatus?.(`Crossfade aplicado · ${r.duration.toFixed(2)}s entre ambos clips`);
  };
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(draw)},true);
  window.addEventListener('profitmente:features-ready',draw,{once:true});
  setInterval(draw,700);draw();
  window.ProfitMenteAudioCrossfade={engine,draw,applySelected:()=>button.click()};
})();
