(()=>{
  const $=s=>document.querySelector(s);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function selectedClip(){const id=window.ProfitMenteEditTools?.selectedId;return (project?.clips||[]).find(c=>c.id===id)||null}
  function normalize(c){const d=Math.max(.05,Number(c?.duration)||.05),fallback=Math.min(.28,Math.max(.08,d*.12)),raw=Number(c?.transitionDuration);return clamp(Number.isFinite(raw)?raw:fallback,.05,Math.min(2,d))}
  function applicable(c){return !!c&&[0,1].includes(Number(c.track))&&['fade','slide','zoom'].includes(c.transition||'cut')}
  const props=$('.props');if(!props)return;
  const section=document.createElement('section');section.className='transitionDurationPanel';section.innerHTML=`<div id="transitionDurationWrap" hidden><label>Duración transición <input id="transitionDurationInput" type="number" min="0.05" max="2" step="0.05"><small id="transitionDurationInfo"></small></label><div class="ciActions"><button id="transitionFast">Rápida 0.15s</button><button id="transitionSmooth">Suave 0.45s</button><button id="transitionAuto">Automática</button></div></div>`;props.appendChild(section);
  const wrap=$('#transitionDurationWrap'),input=$('#transitionDurationInput'),info=$('#transitionDurationInfo');let currentId=null;
  function render(){const c=selectedClip();currentId=c?.id||null;wrap.hidden=!applicable(c);if(!applicable(c))return;const td=normalize(c);if(document.activeElement!==input)input.value=td.toFixed(2);input.max=Math.min(2,Math.max(.05,Number(c.duration)||.05)).toFixed(2);info.textContent=`Entrada visual: ${td.toFixed(2)} s · máximo ${Number(input.max).toFixed(2)} s`}
  function commit(value,auto=false){const c=selectedClip();if(!applicable(c))return;if(auto)delete c.transitionDuration;else c.transitionDuration=clamp(Number(value)||.05,.05,Math.min(2,Math.max(.05,Number(c.duration)||.05)));persist?.();drawTimeline?.();renderAt?.(+$('#playhead').value||0);setStatus?.(auto?'Duración de transición automática':'Duración de transición actualizada');render()}
  input.addEventListener('change',()=>commit(input.value));
  $('#transitionFast').onclick=()=>commit(.15);$('#transitionSmooth').onclick=()=>commit(.45);$('#transitionAuto').onclick=()=>commit(null,true);
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(render)},true);
  const oldDraw=window.drawTimeline;if(typeof oldDraw==='function')window.drawTimeline=function(){oldDraw();requestAnimationFrame(render)};
  setInterval(()=>{if((window.ProfitMenteEditTools?.selectedId||null)!==currentId)render()},400);
  const QA=window.ProfitMenteQAEngine;if(QA&&!QA.prototype.__transitionDurationPatched){const oldInspect=QA.prototype.inspect;QA.prototype.inspect=function(p,a){const r=oldInspect.call(this,p,a);for(const c of p?.clips||[]){if(![0,1].includes(Number(c.track))||!['fade','slide','zoom'].includes(c.transition||'cut')||c.transitionDuration==null)continue;const v=Number(c.transitionDuration),d=Math.max(.05,Number(c.duration)||.05);if(!Number.isFinite(v)||v<.05||v>Math.min(2,d)+.001)r.issues.push(`Duración de transición fuera de rango: ${c.name||c.id}`)}if(r.issues.length){r.ok=false;r.score=Math.max(0,Number(r.score||0)-25)}return r};QA.prototype.__transitionDurationPatched=true}
  window.ProfitMenteTransitionDuration={normalize,applicable};render();
})();