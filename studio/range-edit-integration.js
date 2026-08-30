(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteRangeEditEngine||window.ProfitMenteRangeEdit)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteRangeEditEngine();
  function status(t){setStatus?.(t)}
  function playhead(){return Number($('#playhead')?.value||0)}
  function currentRange(){return window.ProfitMenteRenderRange?.currentRange?.()||{start:0,end:Number(project?.duration)||0,duration:Number(project?.duration)||0}}
  function refreshAt(t,message){
    const ph=$('#playhead');if(ph)ph.value=Math.max(0,Math.min(Number(t)||0,Number(project.duration)||0));
    persist?.();syncForm?.();drawTimeline?.();renderAt?.(Number(ph?.value)||0);window.ProfitMenteRenderRange?.refresh?.();requestAnimationFrame(()=>window.ProfitMenteMultiSelect?.refresh?.());status(message)
  }
  function extract(){
    const r=currentRange();let result;try{result=engine.extract(project,r.start,r.end)}catch(e){status(e.message);return}
    rootSelectionClear();refreshAt(result.start,`Rango extraído · -${result.duration.toFixed(2)}s · ${result.removed} eliminado(s), ${result.trimmed+result.split} recortado(s)`)
  }
  function insert(){
    const input=$('#insertTimeDuration'),duration=Math.max(.05,Number(input?.value)||1);let result;try{result=engine.insert(project,playhead(),duration)}catch(e){status(e.message);return}
    rootSelectionClear();refreshAt(result.at,`Tiempo insertado · +${result.duration.toFixed(2)}s · ${result.moved} clip(s) desplazado(s), ${result.split} dividido(s)`)
  }
  function rootSelectionClear(){window.ProfitMenteEditTools?.select?.(null);window.ProfitMenteMultiSelect?.clear?.()}
  function mount(){
    if($('#rangeEditControls'))return;const host=$('#workRangeControls')||$('.props');if(!host)return;
    const box=document.createElement('div');box.id='rangeEditControls';box.innerHTML='<h3>Edición por rango</h3><div class="rangeEditButtons"><button id="extractRangeEditBtn" title="Eliminar IN→OUT y cerrar el tiempo en todas las pistas desbloqueadas (Alt+Delete)">🗜 Extraer IN→OUT</button><label>Insertar <input id="insertTimeDuration" type="number" min="0.05" max="3600" step="0.05" value="1"> s</label><button id="insertTimeBtn" title="Insertar tiempo vacío en el cursor (Alt+Insert)">➕ Insertar tiempo</button></div><small>Las pistas bloqueadas protegen la sincronía: desbloquéalas si contienen clips después del punto de edición.</small>';
    host.appendChild(box);$('#extractRangeEditBtn').onclick=extract;$('#insertTimeBtn').onclick=insert;
    if(!$('#profitmenteRangeEditStyle')){const s=document.createElement('style');s.id='profitmenteRangeEditStyle';s.textContent='.rangeEditButtons{display:grid;grid-template-columns:1fr;gap:5px}.rangeEditButtons label{display:flex;align-items:center;gap:6px;font-size:11px}.rangeEditButtons input{width:70px}.rangeEditButtons button{font-size:10px;padding:6px}#rangeEditControls{margin-top:9px;padding-top:8px;border-top:1px solid #2d3340}#rangeEditControls h3{margin:4px 0}#rangeEditControls small{display:block;margin-top:5px;color:#8f9aae;font-size:10px;line-height:1.25}';document.head.appendChild(s)}
  }
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||!e.altKey)return;if(e.key==='Delete'){e.preventDefault();extract()}else if(e.key==='Insert'){e.preventDefault();insert()}},true);
  window.addEventListener('profitmente:project-restored',()=>requestAnimationFrame(mount));window.addEventListener('load',mount,{once:true});if(document.readyState==='complete'||document.readyState==='interactive')requestAnimationFrame(mount);
  window.ProfitMenteRangeEdit={engine,extract,insert,mount};
})();
