(()=>{
  const root=typeof window!=='undefined'?window:globalThis,Engine=root.ProfitMenteVisualAdjustEngine;
  if(!Engine||typeof document==='undefined'||root.ProfitMenteVisualAdjustments)return;
  const props=document.querySelector('.props');if(!props)return;
  const engine=new Engine(),$=s=>document.querySelector(s);
  const section=document.createElement('section');section.className='visualAdjustPanel';section.innerHTML=`<hr><h3>Ajustes visuales</h3><div class="ciGrid"><label>Brillo %<input id="vaBrightness" type="number" min="0" max="300" step="1" value="100"></label><label>Contraste %<input id="vaContrast" type="number" min="0" max="300" step="1" value="100"></label><label>Saturación %<input id="vaSaturation" type="number" min="0" max="300" step="1" value="100"></label><label>Escala de grises %<input id="vaGrayscale" type="number" min="0" max="100" step="1" value="0"></label></div><div class="ciActions"><button id="vaApply">Aplicar ajustes</button><button id="vaReset">Restablecer</button></div><small id="vaInfo"></small>`;props.appendChild(section);
  const inputs={brightness:$('#vaBrightness'),contrast:$('#vaContrast'),saturation:$('#vaSaturation'),grayscale:$('#vaGrayscale')},applyBtn=$('#vaApply'),resetBtn=$('#vaReset'),info=$('#vaInfo');
  const scalar=v=>{if(typeof v==='number')return Number.isFinite(v)?String(v):null;if(typeof v!=='string')return null;const s=v.trim();return s||null};
  const idKey=v=>{const s=scalar(v);if(s===null)return null;if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){const n=Number(s);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}return `s:${s}`};
  const sameId=(a,b)=>{const x=idKey(a),y=idKey(b);return x!==null&&x===y};
  const selectedClip=()=>project?.clips?.find(c=>sameId(c?.id,root.ProfitMenteEditTools?.selectedId??null))||null;
  const playhead=()=>{const n=Number($('#playhead')?.value);return Number.isFinite(n)?n:0};
  function fill(state){for(const [key,el] of Object.entries(inputs))if(el)el.value=String(Math.round(Number(state[key])||0))}
  function refresh(){
    const clip=selectedClip(),eligible=engine.eligible(clip),locked=eligible&&engine.clipLocked(project,clip);section.dataset.active=eligible?'1':'0';
    for(const el of [...Object.values(inputs),applyBtn,resetBtn])if(el)el.disabled=!eligible||locked;
    fill(eligible?engine.state(clip):ProfitMenteVisualAdjustEngine.defaults());
    info.textContent=!eligible?'Selecciona un clip visual de Video u Overlays.':locked?'Clip o pista bloqueada.':'Los ajustes se aplican al preview y al render local.';
  }
  function commit(result,label){
    if(!result?.ok){setStatus?.(result?.reason==='locked'?'Ajustes visuales: clip o pista bloqueada':'No se pudieron aplicar los ajustes');refresh();return}
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(playhead())}
    setStatus?.(label);refresh();
  }
  applyBtn.onclick=()=>{const clip=selectedClip();commit(engine.apply(project,clip,Object.fromEntries(Object.entries(inputs).map(([k,el])=>[k,el.value]))),'Ajustes visuales aplicados')};
  resetBtn.onclick=()=>commit(engine.reset(project,selectedClip()),'Ajustes visuales restablecidos');
  for(const el of Object.values(inputs))el?.addEventListener('change',()=>{const clip=selectedClip();if(clip&&engine.eligible(clip))renderAt?.(playhead())});
  document.addEventListener('click',event=>{if(event.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  root.addEventListener?.('profitmente:project-loaded',refresh);root.addEventListener?.('profitmente:project-reset',refresh);
  root.ProfitMenteVisualAdjustments={engine,refresh};refresh();

  // Load the companion crop tool without requiring another static script tag.
  (async()=>{
    const load=src=>new Promise((resolve,reject)=>{if([...document.scripts].some(s=>s.src.endsWith('/'+src)||s.src.endsWith(src)))return resolve();const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar '+src));document.body.appendChild(s)});
    try{if(!root.ProfitMenteVisualCropEngine)await load('visual-crop-engine.js');if(!root.ProfitMenteVisualCrop)await load('visual-crop-integration.js')}catch(err){console.error(err);setStatus?.('Recorte visual no disponible: '+err.message)}
  })();
})();