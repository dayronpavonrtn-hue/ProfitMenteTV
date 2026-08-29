(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteRollEditEngine||window.ProfitMenteRollEdit)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteRollEditEngine(),props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='rollEditPanel';panel.innerHTML='<hr><h3>Roll Edit</h3><div id="rollInfo" class="clipEmpty">Selecciona uno de dos clips contiguos en la misma pista.</div><div class="ciActions"><button id="rollBack">← Corte 0.1s</button><button id="rollForward">Corte 0.1s →</button></div><small>Mueve el punto de corte entre dos clips sin cambiar la duración total del montaje. Conserva el contenido fuente y respeta sus límites.</small>';props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.rollEditPanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.rollEditPanel button:disabled{opacity:.45}.rollEditPanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  const selected=()=>window.ProfitMenteEditTools?.selectedId,pair=()=>engine.findPair(project?.clips,selected()),assetFor=c=>assets?.find(a=>a.id===c?.asset),locked=c=>!!project?.trackState?.[c?.track]?.locked,status=t=>typeof setStatus==='function'&&setStatus(t);
  function state(){
    const p=pair(),info=$('#rollInfo');let disabled=true;
    if(!p){if(info)info.textContent='Selecciona uno de dos clips contiguos en la misma pista.'}
    else if(locked(p.left)||locked(p.right)){if(info)info.textContent='La pista del punto de corte está bloqueada.'}
    else{
      const b=engine.bounds(p.left,p.right,assetFor(p.left),assetFor(p.right));disabled=!b.ok||Math.abs(b.minDelta)<1e-9&&Math.abs(b.maxDelta)<1e-9;
      if(info)info.textContent=b.ok?`${p.left.name||'Clip A'} | ${p.right.name||'Clip B'} · corte ${b.boundary.toFixed(2)}s · rango ${b.minDelta.toFixed(2)}s a +${b.maxDelta.toFixed(2)}s`:'Los clips no forman un punto de corte continuo.';
    }
    ['rollBack','rollForward'].forEach(id=>{const b=$('#'+id);if(b)b.disabled=disabled});
  }
  function roll(delta,label){
    const p=pair();if(!p||locked(p.left)||locked(p.right)){status('No hay un punto de corte editable');state();return}
    const r=engine.roll(p.left,p.right,assetFor(p.left),assetFor(p.right),delta);
    if(!r.ok){status('No se pudo mover el punto de corte');state();return}
    if(!r.changed){status(r.clamped?'Se alcanzó el límite disponible del Roll Edit':'El punto de corte ya está en ese límite');state();return}
    persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);requestAnimationFrame(state);status(`${label} · corte ${r.boundary.toFixed(2)}s${r.clamped?' · limitado por duración/fuente':''}`);
  }
  $('#rollBack').onclick=()=>roll(-.1,'Punto de corte movido 0.1s hacia atrás');
  $('#rollForward').onclick=()=>roll(.1,'Punto de corte movido 0.1s hacia adelante');
  document.addEventListener('click',()=>requestAnimationFrame(state),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey)return;if(!e.shiftKey||!e.altKey)return;if(e.key==='ArrowLeft'){e.preventDefault();roll(-.1,'Punto de corte movido 0.1s hacia atrás')}else if(e.key==='ArrowRight'){e.preventDefault();roll(.1,'Punto de corte movido 0.1s hacia adelante')}});
  window.ProfitMenteRollEdit={engine,state};state();
})();
