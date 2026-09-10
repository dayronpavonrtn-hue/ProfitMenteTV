(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteRateStretchEngine||window.ProfitMenteRateStretch)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteRateStretchEngine(),props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='rateStretchPanel';panel.innerHTML='<hr><h3>Rate Stretch</h3><div id="rateStretchInfo" class="clipEmpty">Selecciona un clip de video o audio.</div><div class="ciActions"><button id="rateStretchShorter">−10% duración</button><button id="rateStretchLonger">+10% duración</button><button id="rateStretchExact">Duración…</button><button id="rateStretchSpeed">Velocidad…</button></div><div class="ciActions rateSpeedPresets"><button data-rate-speed="0.5">0.5×</button><button data-rate-speed="1">1×</button><button data-rate-speed="1.5">1.5×</button><button data-rate-speed="2">2×</button></div><small>Cambia duración o velocidad conservando exactamente el mismo tramo de la fuente. Rango: 0.25×–4×.</small>';props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.rateStretchPanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.rateStretchPanel button:disabled{opacity:.45}.rateStretchPanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}.rateSpeedPresets{margin-top:6px}';document.head.appendChild(style);
  const selected=()=>project?.clips?.find(c=>c?.id===window.ProfitMenteEditTools?.selectedId),assetFor=c=>assets?.find(a=>a.id===c?.asset),locked=c=>window.ProfitMenteEditLockGuard?window.ProfitMenteEditLockGuard.isLocked(project,c):!!c?.locked||!!project?.trackState?.[c?.track]?.locked||!!project?.trackState?.[String(c?.track)]?.locked,status=t=>typeof setStatus==='function'&&setStatus(t);
  function usable(c){const a=assetFor(c);return !!c&&!!c.asset&&a?.type!=='image'}
  function state(){
    const c=selected(),info=$('#rateStretchInfo');let disabled=true;
    if(!c){if(info)info.textContent='Selecciona un clip de video o audio.'}
    else if(locked(c)){if(info)info.textContent='El clip o su pista está bloqueado.'}
    else if(!usable(c)){if(info)info.textContent='Rate Stretch requiere un clip de video o audio con fuente.'}
    else{
      const next=engine.nextOnTrack(project?.clips,c),b=engine.targetBounds(c,assetFor(c),next,project?.duration);disabled=!b.ok;
      if(info)info.textContent=b.ok?`${c.name||'Clip'} · ${b.currentDuration.toFixed(2)}s · ${engine.speed(c).toFixed(2)}× · rango ${b.minDuration.toFixed(2)}–${b.maxDuration.toFixed(2)}s`:'El clip no tiene un rango fuente válido para Rate Stretch.';
    }
    ['rateStretchShorter','rateStretchLonger','rateStretchExact','rateStretchSpeed'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=disabled});
    document.querySelectorAll('[data-rate-speed]').forEach(b=>b.disabled=disabled);
  }
  function apply(target,label){
    const c=selected();if(!usable(c)||locked(c)){status('No hay un clip editable para Rate Stretch');state();return}
    const next=engine.nextOnTrack(project?.clips,c),r=engine.stretch(c,assetFor(c),target,next,project?.duration);
    if(!r.ok){status('No se pudo aplicar Rate Stretch');state();return}
    if(!r.changed){status(r.clamped?'Se alcanzó el límite disponible de Rate Stretch':'El clip ya tiene esa duración');state();return}
    persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);requestAnimationFrame(state);status(`${label} · ${r.duration.toFixed(2)}s · ${r.speed.toFixed(2)}×${r.clamped?' · limitado por pista/proyecto':''}`);
  }
  function applySpeed(target,label='Velocidad'){ 
    const c=selected();if(!usable(c)||locked(c)){status('No hay un clip editable para cambiar velocidad');state();return}
    const next=engine.nextOnTrack(project?.clips,c),r=engine.stretchToSpeed(c,assetFor(c),target,next,project?.duration);
    if(!r.ok){status('Velocidad inválida o fuente fuera de rango');state();return}
    if(!r.changed){status(r.speedClamped?`Velocidad limitada a ${r.speed.toFixed(2)}×`:'El clip ya tiene esa velocidad');state();return}
    persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);requestAnimationFrame(state);status(`${label} · ${r.speed.toFixed(2)}× · ${r.duration.toFixed(2)}s${r.speedClamped?' · limitada por pista/proyecto':''}`);
  }
  $('#rateStretchShorter').onclick=()=>{const c=selected();if(c)apply(engine.duration(c)*.9,'Rate Stretch')};
  $('#rateStretchLonger').onclick=()=>{const c=selected();if(c)apply(engine.duration(c)*1.1,'Rate Stretch')};
  $('#rateStretchExact').onclick=()=>{const c=selected();if(!c)return;const raw=prompt('Nueva duración del clip en segundos:',engine.duration(c).toFixed(2));if(raw===null)return;apply(Number(String(raw).replace(',','.')),'Rate Stretch')};
  $('#rateStretchSpeed').onclick=()=>{const c=selected();if(!c)return;const raw=prompt('Nueva velocidad del clip (0.25×–4×):',engine.speed(c).toFixed(2));if(raw===null)return;applySpeed(Number(String(raw).replace(',','.')))};
  document.querySelectorAll('[data-rate-speed]').forEach(b=>b.onclick=()=>applySpeed(Number(b.dataset.rateSpeed),`Velocidad ${b.dataset.rateSpeed}×`));
  document.addEventListener('click',()=>requestAnimationFrame(state),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.shiftKey)return;if(!e.altKey)return;const c=selected();if(!c||locked(c))return;if(e.key==='['){e.preventDefault();apply(engine.duration(c)*.9,'Rate Stretch')}else if(e.key===']'){e.preventDefault();apply(engine.duration(c)*1.1,'Rate Stretch')}});
  window.ProfitMenteRateStretch={engine,state,apply,applySpeed};state();
})();