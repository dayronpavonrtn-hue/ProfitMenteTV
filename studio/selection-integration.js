(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSelectionEngine)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteSelectionEngine();
  const props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='multiSelectPanel';panel.innerHTML=`<hr><h3>Selección múltiple</h3><div id="multiSelectInfo" class="clipEmpty">Shift/Ctrl + clic para seleccionar varios clips.</div><div class="ciActions"><button id="multiLeft">← 0.1s</button><button id="multiRight">0.1s →</button><button id="multiDuplicate">⧉ Duplicar grupo</button><button id="multiDelete">⌫ Borrar grupo</button><button id="multiRippleDelete" title="Borra la selección y cierra el hueco si no hay solapamientos o pistas bloqueadas que puedan desincronizarse">⇤ Borrar + cerrar hueco</button><button id="multiClear">Limpiar</button></div><small id="multiRippleHelp">Ripple delete solo actúa cuando el intervalo seleccionado está libre de clips no seleccionados y puede cerrarse sin mover pistas bloqueadas.</small>`;props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.clip.multi-selected{outline:2px solid #ffe66d;box-shadow:0 0 0 2px rgba(255,230,109,.25) inset}.multiSelectPanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.multiSelectPanel button:disabled{opacity:.45}.multiSelectPanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function refresh(){
    document.querySelectorAll('.clip').forEach(el=>el.classList.toggle('multi-selected',engine.has(el.dataset.id)));
    const count=engine.count,info=$('#multiSelectInfo');if(info)info.textContent=count?`${count} clip${count===1?'':'s'} seleccionado${count===1?'':'s'}.`:'Shift/Ctrl + clic para seleccionar varios clips.';
    ['multiLeft','multiRight','multiDuplicate','multiDelete'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=count<2});
    const ripple=$('#multiRippleDelete');if(ripple)ripple.disabled=count<1;
    $('#multiClear').disabled=count===0;
  }
  function commit(message){persist?.();drawTimeline?.();renderAt?.(+$('#playhead').value||0);requestAnimationFrame(refresh);status(message)}
  document.addEventListener('click',e=>{const el=e.target.closest?.('.clip');if(!el)return;const multi=e.shiftKey||e.ctrlKey||e.metaKey;if(multi)engine.toggle(el.dataset.id);else engine.set([el.dataset.id]);requestAnimationFrame(refresh)},true);
  $('#multiLeft').onclick=()=>{const r=engine.shift(project,-.1);commit(r.moved?`${r.moved} clips desplazados ${r.delta.toFixed(1)}s${r.blocked?` · ${r.blocked} bloqueado(s)`:''}`:'No se pudo desplazar la selección')};
  $('#multiRight').onclick=()=>{const r=engine.shift(project,.1);commit(r.moved?`${r.moved} clips desplazados +${r.delta.toFixed(1)}s${r.blocked?` · ${r.blocked} bloqueado(s)`:''}`:'No se pudo desplazar la selección')};
  $('#multiDuplicate').onclick=()=>{const r=engine.duplicate(project,.35);if(!r.clips.length){status('No hay clips editables en la selección');return}window.ProfitMenteEditTools?.select(r.clips[0].id);commit(`${r.clips.length} clips duplicados conservando su separación${r.blocked?` · ${r.blocked} bloqueado(s)`:''}`)};
  $('#multiDelete').onclick=()=>{const r=engine.remove(project);if(!r.removed){status('No hay clips editables para borrar');return}window.ProfitMenteEditTools?.select(r.remaining[0]||null);commit(`${r.removed} clips eliminados${r.blocked?` · ${r.blocked} bloqueado(s)`:''}`)};
  $('#multiRippleDelete').onclick=()=>{
    const r=engine.rippleRemove(project);
    if(r.reason==='locked-selection'){status(`Ripple cancelado: ${r.blocked} clip(s) seleccionado(s) están en pistas bloqueadas`);return}
    if(r.reason==='overlap'){status(`Ripple cancelado: ${r.blocked} clip(s) no seleccionado(s) cruzan el intervalo; selecciónalos también o usa borrado normal`);return}
    if(r.reason==='locked-after'){status(`Ripple cancelado: ${r.blocked} clip(s) posteriores están en pistas bloqueadas y quedarían desincronizados`);return}
    if(!r.removed){status('No hay un intervalo válido para cerrar');return}
    window.ProfitMenteEditTools?.select(null);commit(`${r.removed} clip${r.removed===1?'':'s'} eliminado${r.removed===1?'':'s'} · hueco de ${r.gap.toFixed(2)}s cerrado · ${r.shifted} clip(s) desplazados`)
  };
  $('#multiClear').onclick=()=>{engine.clear();refresh();status('Selección múltiple limpiada')};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&engine.count){engine.clear();refresh();status('Selección múltiple limpiada')}});
  const oldDraw=window.drawTimeline;if(typeof oldDraw==='function')window.drawTimeline=function(){oldDraw();requestAnimationFrame(refresh)};
  window.ProfitMenteMultiSelect={engine,refresh};refresh();
})();