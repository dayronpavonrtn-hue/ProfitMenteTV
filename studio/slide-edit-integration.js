(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSlideEditEngine||window.ProfitMenteSlideEdit)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteSlideEditEngine(),props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='slideEditPanel';panel.innerHTML='<hr><h3>Slide Edit</h3><div id="slideInfo" class="clipEmpty">Selecciona un clip con un vecino continuo a cada lado.</div><div class="ciActions"><button id="slideBack">← Deslizar 0.1s</button><button id="slideForward">Deslizar 0.1s →</button></div><small>Mueve el clip entre sus vecinos sin cambiar su duración ni la duración total del montaje. Los bordes vecinos se ajustan usando sus medios fuente disponibles.</small>';props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.slideEditPanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.slideEditPanel button:disabled{opacity:.45}.slideEditPanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  const selected=()=>window.ProfitMenteEditTools?.selectedId,status=t=>typeof setStatus==='function'&&setStatus(t);
  function ctx(){return engine.context(project,selected(),assets)}
  function state(){
    const c=ctx(),info=$('#slideInfo'),disabled=!c.ok||Math.abs(c.minDelta)<1e-9&&Math.abs(c.maxDelta)<1e-9;
    ['slideBack','slideForward'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=disabled});
    if(!info)return;
    if(!selected()){info.textContent='Selecciona un clip con un vecino continuo a cada lado.';return}
    if(!c.ok){
      const messages={locked:'El clip, uno de sus vecinos o la pista está bloqueado.','needs-two-adjacent':'Slide Edit necesita un clip continuo a cada lado.','invalid-source-window':'Los metadatos de fuente de un vecino no son válidos.','invalid-clip':'El clip seleccionado tiene tiempos no válidos.','ambiguous-id':'El ID del clip es ambiguo.'};
      info.textContent=messages[c.reason]||'Este clip no admite Slide Edit.';return;
    }
    info.textContent=`${c.left.name||'Anterior'} | ${c.clip.name||'Seleccionado'} | ${c.right.name||'Siguiente'} · rango ${c.minDelta.toFixed(2)}s a +${c.maxDelta.toFixed(2)}s`;
  }
  function slide(delta,label){
    const r=engine.slide(project,selected(),assets,delta);
    if(!r.ok){status(r.reason==='locked'?'No se puede deslizar: hay un bloqueo':'No se pudo realizar Slide Edit');state();return}
    if(!r.changed){status(r.clamped?'Se alcanzó el límite disponible para Slide Edit':'El clip ya está en ese límite');state();return}
    persist?.();drawTimeline?.();renderAt?.((()=>{const v=$('#playhead')?.value;if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'&&/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(v.trim())){const n=Number(v);if(Number.isFinite(n))return n}return 0})());requestAnimationFrame(state);
    status(`${label} · ${Math.abs(r.delta).toFixed(2)}s${r.clamped?' · limitado por duración/fuente':''}`);
  }
  $('#slideBack').onclick=()=>slide(-.1,'Clip deslizado hacia atrás');
  $('#slideForward').onclick=()=>slide(.1,'Clip deslizado hacia adelante');
  document.addEventListener('click',()=>requestAnimationFrame(state),true);
  window.ProfitMenteSlideEdit={engine,state};state();
})();