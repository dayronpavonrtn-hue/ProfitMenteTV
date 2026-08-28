(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteRenderRangeEngine)return;
  const E=window.ProfitMenteRenderRangeEngine,$=s=>document.querySelector(s);let previewTimer=null;
  function now(){return Number($('#playhead')?.value||0)}
  function currentRange(){const r=project?.workRange||{};return E.normalize(project,Number(r.start)||0,Number.isFinite(Number(r.end))?Number(r.end):Number(project?.duration)||0)}
  function persistRange(start,end){project.workRange={start,end};persist?.();refresh()}
  function status(t){setStatus?.(t)}
  function refresh(){
    const r=currentRange(),label=$('#workRangeLabel');if(label)label.textContent=`${E.time(r.start)} → ${E.time(r.end)} · ${r.duration.toFixed(2)}s`;
    const render=$('#renderRangeBtn');if(render)render.disabled=!E.valid(project,r.start,r.end);
  }
  function stopRangePreview(){if(previewTimer){clearInterval(previewTimer);previewTimer=null}if(typeof playing!=='undefined'&&playing)$('#playBtn')?.click()}
  async function previewRange(){
    const r=currentRange();if(!E.valid(project,r.start,r.end)){status('Define un rango válido de al menos 0.25s');return}
    stopRangePreview();window.ProfitMenteTransport?.seek?.(r.start);$('#playhead').value=r.start;await renderAt?.(r.start);$('#playBtn')?.click();
    previewTimer=setInterval(()=>{const t=now();if(t>=r.end-.015||t<r.start-.05){stopRangePreview();window.ProfitMenteTransport?.seek?.(r.start);status(`Preview de rango terminado · ${r.duration.toFixed(2)}s`)}},35);
    status(`Preview del rango ${E.time(r.start)} → ${E.time(r.end)}`);
  }
  async function renderRange(){
    const r=currentRange();if(!E.valid(project,r.start,r.end)){status('Rango de render inválido');return}
    let derived;try{derived=E.extract(project,r.start,r.end,assets)}catch(e){status(e.message);return}
    const report=qa.inspect(derived,assets);if(report.issues.length){status('Render de rango bloqueado por QA');const el=$('#qaReport');if(el){el.hidden=false;el.innerHTML=`<b>QA rango ${report.score}/100 ✕</b><br>${report.issues.map(x=>'❌ '+x).join('<br>')}`};return}
    const btn=$('#renderRangeBtn');btn.disabled=true;try{status(`Renderizando rango ${r.duration.toFixed(2)}s…`);const size=await bundler.renderLocal(derived,assets,status);status(`Rango MP4 descargado · ${(size/1048576).toFixed(1)} MB · ${r.duration.toFixed(2)}s`)}catch(e){console.error(e);status('No se pudo renderizar el rango: '+e.message)}finally{btn.disabled=false;refresh()}
  }
  function mount(){
    if($('#workRangeControls'))return;const props=document.querySelector('.props');if(!props)return;
    const box=document.createElement('div');box.id='workRangeControls';box.className='workRangeControls';box.innerHTML='<h3>Rango de trabajo</h3><div id="workRangeLabel"></div><div class="workRangeButtons"><button id="setRangeInBtn" title="Marcar inicio en el cursor (I)">[ Marcar IN</button><button id="setRangeOutBtn" title="Marcar fin en el cursor (O)">Marcar OUT ]</button><button id="previewRangeBtn">▶ Preview rango</button><button id="renderRangeBtn">🎬 MP4 del rango</button><button id="clearRangeBtn">Todo el proyecto</button></div>';
    props.appendChild(box);
    $('#setRangeInBtn').onclick=()=>{const r=currentRange(),t=now();persistRange(Math.min(t,r.end-.25),r.end);status(`IN marcado en ${E.time(currentRange().start)}`)};
    $('#setRangeOutBtn').onclick=()=>{const r=currentRange(),t=now();persistRange(r.start,Math.max(t,r.start+.25));status(`OUT marcado en ${E.time(currentRange().end)}`)};
    $('#clearRangeBtn').onclick=()=>{persistRange(0,Number(project.duration)||0);status('Rango restablecido a todo el proyecto')};
    $('#previewRangeBtn').onclick=previewRange;$('#renderRangeBtn').onclick=renderRange;
    document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.toLowerCase()==='i'){e.preventDefault();$('#setRangeInBtn').click()}else if(e.key.toLowerCase()==='o'){e.preventDefault();$('#setRangeOutBtn').click()}});
    if(!document.querySelector('#profitmenteWorkRangeStyle')){const s=document.createElement('style');s.id='profitmenteWorkRangeStyle';s.textContent='.workRangeControls{margin-top:10px;padding-top:8px;border-top:1px solid #2d3340}.workRangeControls h3{margin:4px 0}.workRangeControls #workRangeLabel{font-size:11px;color:#aeb7c8;margin:5px 0}.workRangeButtons{display:grid;grid-template-columns:1fr 1fr;gap:5px}.workRangeButtons button{font-size:10px;padding:6px}';document.head.appendChild(s)}
    refresh();
  }
  const basePersist=window.persist;if(typeof basePersist==='function')window.persist=function(){basePersist();refresh()};
  window.addEventListener('profitmente:project-restored',refresh);window.addEventListener('load',()=>{mount();refresh()},{once:true});if(document.readyState==='complete'){mount();refresh()}
  window.ProfitMenteRenderRange={currentRange,previewRange,renderRange,refresh};
})();
