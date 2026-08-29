(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteFreezeFrameEngine||window.ProfitMenteFreezeFrame)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteFreezeFrameEngine(),props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='freezeFramePanel';panel.innerHTML='<hr><h3>Freeze Frame</h3><div id="freezeFrameInfo" class="clipEmpty">Selecciona un clip de video.</div><div class="ciActions"><button id="freezeFrameSet">❄ Congelar en cursor</button><button id="freezeFrameClear">Reanudar video</button></div><small>Congela todo el clip usando exactamente el fotograma situado bajo el cursor. Es no destructivo y se conserva en el proyecto y el render MP4.</small>';props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.freezeFramePanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.freezeFramePanel button:disabled{opacity:.45}.freezeFramePanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  const selected=()=>project?.clips?.find(c=>c?.id===window.ProfitMenteEditTools?.selectedId),assetFor=c=>assets?.find(a=>a.id===c?.asset),locked=c=>!!project?.trackState?.[c?.track]?.locked,status=t=>typeof setStatus==='function'&&setStatus(t),playhead=()=>Number($('#playhead')?.value)||0;
  function usable(c){return !!c&&assetFor(c)?.type==='video'}
  function state(){
    const c=selected(),info=$('#freezeFrameInfo'),set=$('#freezeFrameSet'),clear=$('#freezeFrameClear');let canSet=false,canClear=false;
    if(!c){if(info)info.textContent='Selecciona un clip de video.'}
    else if(locked(c)){if(info)info.textContent='La pista del clip está bloqueada.'}
    else if(!usable(c)){if(info)info.textContent='Freeze Frame requiere un clip de video.'}
    else{
      canSet=true;canClear=engine.frozen(c);
      if(info)info.textContent=canClear?`${c.name||'Video'} · congelado en fuente ${Number(c.freezeFrameSource).toFixed(2)}s`:`${c.name||'Video'} · reproducción normal`;
    }
    if(set)set.disabled=!canSet;if(clear)clear.disabled=!canClear;
  }
  function refresh(){persist?.();drawTimeline?.();renderAt?.(playhead());requestAnimationFrame(state)}
  function setFreeze(){
    const c=selected();if(!usable(c)||locked(c)){status('Selecciona un clip de video editable');state();return}
    const t=Math.max(Number(c.start)||0,Math.min((Number(c.start)||0)+(Number(c.duration)||0)-.001,playhead()));
    const r=engine.set(c,t,assetFor(c));if(!r.ok){status('No se pudo congelar el fotograma');return}
    if(r.changed)refresh();else state();status(`Fotograma congelado · fuente ${r.time.toFixed(2)}s`);
  }
  function clearFreeze(){
    const c=selected();if(!c||locked(c))return;const r=engine.clear(c);if(r.changed){refresh();status('Freeze Frame desactivado · reproducción normal')}else state();
  }
  $('#freezeFrameSet').onclick=setFreeze;$('#freezeFrameClear').onclick=clearFreeze;
  document.addEventListener('click',()=>requestAnimationFrame(state),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey)return;if(e.altKey&&e.key.toLowerCase()==='f'){e.preventDefault();setFreeze()}});
  window.ProfitMenteFreezeFrame={engine,state,set:setFreeze,clear:clearFreeze};state();
})();
