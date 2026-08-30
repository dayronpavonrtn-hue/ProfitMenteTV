(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof document==='undefined'||!root.ProfitMenteRemoveTimeEngine)return;
  const $=s=>document.querySelector(s),engine=new root.ProfitMenteRemoveTimeEngine();
  const playhead=()=>+$('#playhead')?.value||0;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function commit(t){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();if(typeof renderAt==='function')renderAt(playhead());status(t)}
  function addButton(){if($('#removeTimeBtn'))return $('#removeTimeBtn');const b=document.createElement('button');b.id='removeTimeBtn';b.textContent='− Tiempo';b.title='Eliminar 1 segundo vacío y cerrar todas las pistas (Ctrl/Cmd+Shift+Backspace)';const ref=$('#insertTimeBtn')||$('#insertGapBtn');ref?.parentNode?.insertBefore(b,ref.nextSibling);return b}
  const btn=addButton();
  function canRemove(){const p=root.project||project,t=playhead(),duration=Math.max(0,Number(p?.duration)||0);if(t+1>duration+.001)return false;return !(p.clips||[]).some(c=>{const s=Number(c.start)||0,e=s+Math.max(0,Number(c.duration)||0);return s<t+1-.001&&e>t+.001})}
  function update(){if(btn)btn.disabled=!canRemove()}
  function removeTime(){const p=root.project||project,r=engine.remove(p,playhead(),1);if(!r.ok){if(r.reason==='occupied')status(`No se puede quitar tiempo: hay contenido en la pista ${Number(r.track)+1} dentro del segundo seleccionado`);else if(r.reason==='locked')status(`No se puede quitar tiempo: la pista ${Number(r.track)+1} está bloqueada`);else status('No hay 1 segundo completo disponible desde el cursor');update();return}commit(`Tiempo global −1.00s · ${r.moved} clip(s) desplazados`);update()}
  btn?.addEventListener('click',removeTime);
  $('#playhead')?.addEventListener('input',update);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.shiftKey&&e.key==='Backspace'){e.preventDefault();removeTime()}});
  update();root.ProfitMenteRemoveTime=engine;
})();
