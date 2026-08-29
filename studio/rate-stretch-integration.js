(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteRateStretchEngine||window.ProfitMenteRateStretch)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteRateStretchEngine(),props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='rateStretchPanel';panel.innerHTML='<hr><h3>Rate Stretch</h3><div id="rateStretchInfo" class="clipEmpty">Selecciona un clip de video o audio.</div><div class="ciActions"><button id="rateStretchShorter">−10% duración</button><button id="rateStretchLonger">+10% duración</button><button id="rateStretchExact">Duración…</button></div><small>Cambia la duración ajustando la velocidad, conservando exactamente el mismo tramo de la fuente. Rango de velocidad: 0.25×–4×.</small>';props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.rateStretchPanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.rateStretchPanel button:disabled{opacity:.45}.rateStretchPanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  const selected=()=>project?.clips?.find(c=>c?.id===window.ProfitMenteEditTools?.selectedId),assetFor=c=>assets?.find(a=>a.id===c?.asset),locked=c=>!!project?.trackState?.[c?.track]?.locked,status=t=>typeof setStatus==='function'&&setStatus(t);
  function usable(c){const a=assetFor(c);return !!c&&!!c.asset&&a?.type!=='image'}
  function state(){
    const c=selected(),info=$('#rateStretchInfo');let disabled=true;
    if(!c){if(info)info.textContent='Selecciona un clip de video o audio.'}
    else if(locked(c)){if(info)info.textContent='La pista del clip está bloqueada.'}
    else if(!usable(c)){if(info)info.textContent='Rate Stretch requiere un clip de video o audio con fuente.'}
    else{
      const next=engine.nextOnTrack(project?.clips,c),b=engine.targetBounds(c,assetFor(c),next,project?.duration);disabled=!b.ok;
      if(info)info.textContent=b.ok?`${c.name||'Clip'} · ${b.currentDuration.toFixed(2)}s · ${engine.speed(c).toFixed(2)}× · rango ${b.minDuration.toFixed(2)}–${b.maxDuration.toFixed(2)}s`:'El clip no tiene un rango fuente válido para Rate Stretch.';
    }
    ['rateStretchShorter','rateStretchLonger','rateStretchExact'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=disabled});
  }
  function apply(target,label){
    const c=selected();if(!usable(c)||locked(c)){status('No hay un clip editable para Rate Stretch');state();return}
    const next=engine.nextOnTrack(project?.clips,c),r=engine.stretch(c,assetFor(c),target,next,project?.duration);
    if(!r.ok){status('No se pudo aplicar Rate Stretch');state();return}
    if(!r.changed){status(r.clamped?'Se alcanzó el límite disponible de Rate Stretch':'El clip ya tiene esa duración');state();return}
    persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);requestAnimationFrame(state);status(`${label} · ${r.duration.toFixed(2)}s · ${r.speed.toFixed(2)}×${r.clamped?' · limitado por pista/proyecto':''}`);
  }
  $('#rateStretchShorter').onclick=()=>{const c=selected();if(c)apply(engine.duration(c)*.9,'Rate Stretch')};
  $('#rateStretchLonger').onclick=()=>{const c=selected();if(c)apply(engine.duration(c)*1.1,'Rate Stretch')};
  $('#rateStretchExact').onclick=()=>{const c=selected();if(!c)return;const raw=prompt('Nueva duración del clip en segundos:',engine.duration(c).toFixed(2));if(raw===null)return;apply(Number(String(raw).replace(',','.')),'Rate Stretch')};
  document.addEventListener('click',()=>requestAnimationFrame(state),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.shiftKey)return;if(!e.altKey)return;const c=selected();if(!c)return;if(e.key==='['){e.preventDefault();apply(engine.duration(c)*.9,'Rate Stretch')}else if(e.key===']'){e.preventDefault();apply(engine.duration(c)*1.1,'Rate Stretch')}});
  window.ProfitMenteRateStretch={engine,state,apply};state();
})();
