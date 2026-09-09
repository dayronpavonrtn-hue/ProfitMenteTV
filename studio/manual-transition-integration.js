(()=>{
  const root=typeof window!=='undefined'?window:globalThis,Engine=root.ProfitMenteManualTransitionEngine;if(!Engine||typeof document==='undefined')return;
  if(root.ProfitMenteManualTransitions)return;
  const $=s=>document.querySelector(s),props=$('.props');if(!props)return;
  const section=document.createElement('section');section.className='manualTransitionPanel';section.innerHTML=`<hr><h3>Transiciones por lote</h3><label>Aplicar a<select id="manualTransitionScope"><option value="selected">Clip seleccionado</option><option value="track">Pista visual seleccionada</option><option value="all">Todos los clips visuales</option></select></label><label>Tipo<select id="manualTransitionType"><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="cut">Corte</option></select></label><label>Duración<select id="manualTransitionDuration"><option value="auto">Automática por clip</option><option value="0.15">Rápida · 0.15 s</option><option value="0.30">Media · 0.30 s</option><option value="0.45">Suave · 0.45 s</option></select></label><div class="ciActions"><button id="manualTransitionApply">Aplicar transición</button><button id="manualTransitionReset">Quitar transiciones</button></div><small id="manualTransitionInfo"></small>`;props.appendChild(section);
  const scope=$('#manualTransitionScope'),type=$('#manualTransitionType'),duration=$('#manualTransitionDuration'),apply=$('#manualTransitionApply'),reset=$('#manualTransitionReset'),info=$('#manualTransitionInfo');
  const selectedId=()=>root.ProfitMenteEditTools?.selectedId??null;
  const playhead=()=>{const n=Number($('#playhead')?.value);return Number.isFinite(n)?n:0};
  function refresh(){
    const stats=Engine.inspect(project,{scope:scope.value,selectedId:selectedId()});
    apply.disabled=stats.editable===0;reset.disabled=stats.editable===0;
    const reason=stats.reason==='no-selection'?'Selecciona un clip visual para usar este alcance.':stats.reason!=='ok'?'Alcance no válido.':'';
    info.textContent=reason||`${stats.targets} clip(s) objetivo · ${stats.editable} editable(s)${stats.locked?` · ${stats.locked} bloqueado(s)`:''}`;
    duration.disabled=type.value==='cut';
  }
  function commit(result,action){
    if(result.reason!=='ok'){setStatus?.(result.reason==='no-selection'?'Selecciona un clip visual primero':'No se pudo aplicar la transición');refresh();return}
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(playhead())}
    const blocked=result.locked?` · ${result.locked} bloqueado(s)`:'';
    setStatus?.(`${action}: ${result.changed} clip(s) actualizado(s)${blocked}`);refresh();
  }
  apply.onclick=()=>commit(Engine.apply(project,{scope:scope.value,selectedId:selectedId(),type:type.value,duration:duration.value}),'Transición aplicada');
  reset.onclick=()=>commit(Engine.apply(project,{scope:scope.value,selectedId:selectedId(),type:'cut'}),'Transiciones quitadas');
  scope.addEventListener('change',refresh);type.addEventListener('change',refresh);duration.addEventListener('change',refresh);
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  root.addEventListener?.('profitmente:project-loaded',refresh);root.addEventListener?.('profitmente:project-reset',refresh);
  const timer=setInterval(refresh,700);
  root.ProfitMenteManualTransitions={refresh,destroy(){clearInterval(timer);section.remove();delete root.ProfitMenteManualTransitions}};
  refresh();
  (async()=>{
    const load=src=>new Promise((resolve,reject)=>{if([...document.scripts].some(s=>s.src.endsWith('/'+src)||s.src.endsWith(src)))return resolve();const el=document.createElement('script');el.src=src;el.async=false;el.onload=resolve;el.onerror=()=>reject(new Error('No se pudo cargar '+src));document.body.appendChild(el)});
    try{if(!root.ProfitMenteTransitionClipboardEngine)await load('transition-clipboard-engine.js');if(!root.ProfitMenteTransitionClipboard)await load('transition-clipboard-integration.js')}catch(err){console.error(err)}
  })();
})();
