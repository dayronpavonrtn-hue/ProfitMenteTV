(()=>{
  if(typeof document==='undefined'||typeof project==='undefined'||typeof ProfitMenteRecoveryEngine==='undefined')return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteRecoveryEngine(localStorage,{limit:20}),aside=$('aside');if(!aside)return;
  let showAll=false;
  const section=document.createElement('section');section.className='recoveryPanel';section.innerHTML='<h3>Recuperación</h3><div class="projectLibraryActions"><button id="recoverySnapshotBtn">⟲ Crear punto</button><button id="recoveryRefreshBtn">↻ Ver versiones</button><button id="recoveryAllBtn" title="Mostrar también copias de otros proyectos">☰ Ver todos</button></div><div id="recoveryList" class="projectLibraryList"></div>';aside.appendChild(section);
  const status=t=>typeof setStatus==='function'&&setStatus(t);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  function rows(){return (showAll?engine.list():engine.list(project)).slice(0,showAll?12:6)}
  function render(){
    const el=$('#recoveryList'),list=rows(),toggle=$('#recoveryAllBtn');
    if(toggle)toggle.textContent=showAll?'◉ Solo actual':'☰ Ver todos';
    el.innerHTML=list.length?'':`<small>${showAll?'No hay puntos de recuperación guardados.':'Sin puntos de recuperación para este proyecto.'}</small>`;
    for(const row of list){
      const card=document.createElement('div');card.className='projectLibraryCard';const when=new Date(row.createdAt).toLocaleString();
      const scope=showAll?` · ${row.libraryId?'guardado':'borrador'}`:'';
      card.innerHTML=`<button class="projectOpen" data-recover="${row.id}"><b>${esc(row.name)}</b><small>${esc(row.reason)}${scope} · ${when}</small></button><button class="projectDelete" data-drop="${row.id}" title="Eliminar">×</button>`;el.appendChild(card)
    }
  }
  function capture(reason='change'){const snap=engine.capture(project,reason);if(snap)render();return snap}
  function ensureCurrentProjectRecovery(){
    showAll=false;
    if(!engine.latest(project))capture('inicio');else render();
  }
  function flushBeforeRestore(){
    const flush=window.ProfitMenteNewProject?.flushCurrentProject;
    if(typeof flush==='function')return flush()!==false;
    capture('antes de restaurar');
    return true;
  }
  function normalizeRestoredProject(next){
    if(!next?.libraryId)return next;
    const lib=window.profitMenteProjectLibrary;
    if(lib?.load&&lib.load(next.libraryId))return next;
    const copy=structuredClone(next);delete copy.libraryId;return copy;
  }
  function restore(id){
    let next=engine.restore(id);if(!next)return;
    if(!flushBeforeRestore()){status('No se pudo guardar el proyecto actual; restauración cancelada');return}
    next=normalizeRestoredProject(next);project=next;
    if(typeof persist==='function')persist();else if(typeof originalPersist==='function')originalPersist();
    if(typeof drawTimeline==='function')drawTimeline();if(typeof drawLibrary==='function')drawLibrary();if(typeof syncForm==='function')syncForm();
    const ph=$('#playhead');if(ph)ph.value=0;if(typeof renderAt==='function')renderAt(0);if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project);
    showAll=false;render();
    window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',recovered:true}}));
    status(`Punto de recuperación restaurado: ${project.name||'Sin título'}`)
  }
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist){persist=function(){basePersist();capture('autoguardado')}}
  $('#recoverySnapshotBtn').onclick=()=>{capture('manual');status('Punto de recuperación creado')};
  $('#recoveryRefreshBtn').onclick=render;
  $('#recoveryAllBtn').onclick=()=>{showAll=!showAll;render();status(showAll?'Mostrando recuperación de todos los proyectos':'Mostrando recuperación del proyecto actual')};
  section.addEventListener('click',e=>{const open=e.target.closest('[data-recover]');if(open)return restore(open.dataset.recover);const drop=e.target.closest('[data-drop]');if(drop){engine.remove(drop.dataset.drop);render();status('Punto de recuperación eliminado')}});
  window.addEventListener('profitmente:project-opened',ensureCurrentProjectRecovery);
  window.addEventListener('beforeunload',()=>{try{capture('cierre')}catch{}});
  ensureCurrentProjectRecovery();window.profitMenteRecovery=engine;
})();