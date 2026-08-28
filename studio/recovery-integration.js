(()=>{
  if(typeof document==='undefined'||typeof project==='undefined'||typeof ProfitMenteRecoveryEngine==='undefined')return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteRecoveryEngine(localStorage,{limit:20}),aside=$('aside');if(!aside)return;
  const section=document.createElement('section');section.className='recoveryPanel';section.innerHTML='<h3>Recuperación</h3><div class="projectLibraryActions"><button id="recoverySnapshotBtn">⟲ Crear punto</button><button id="recoveryRefreshBtn">↻ Ver versiones</button></div><div id="recoveryList" class="projectLibraryList"></div>';aside.appendChild(section);
  const status=t=>typeof setStatus==='function'&&setStatus(t);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function rows(){return engine.list(project).slice(0,6)}
  function render(){const el=$('#recoveryList'),list=rows();el.innerHTML=list.length?'':'<small>Sin puntos de recuperación todavía.</small>';for(const row of list){const card=document.createElement('div');card.className='projectLibraryCard';const when=new Date(row.createdAt).toLocaleString();card.innerHTML=`<button class="projectOpen" data-recover="${row.id}"><b>${esc(row.name)}</b><small>${esc(row.reason)} · ${when}</small></button><button class="projectDelete" data-drop="${row.id}" title="Eliminar">×</button>`;el.appendChild(card)}}
  function capture(reason='change'){const snap=engine.capture(project,reason);if(snap)render();return snap}
  function restore(id){const next=engine.restore(id);if(!next)return;capture('antes de restaurar');project=next;if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof drawLibrary==='function')drawLibrary();if(typeof syncForm==='function')syncForm();const ph=$('#playhead');if(ph)ph.value=0;if(typeof renderAt==='function')renderAt(0);if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project);render();status('Punto de recuperación restaurado')}
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist){persist=function(){basePersist();capture('autoguardado')}}
  $('#recoverySnapshotBtn').onclick=()=>{capture('manual');status('Punto de recuperación creado')};
  $('#recoveryRefreshBtn').onclick=render;
  section.addEventListener('click',e=>{const open=e.target.closest('[data-recover]');if(open)return restore(open.dataset.recover);const drop=e.target.closest('[data-drop]');if(drop){engine.remove(drop.dataset.drop);render();status('Punto de recuperación eliminado')}});
  window.addEventListener('beforeunload',()=>{try{capture('cierre')}catch{}});
  const latest=engine.latest(project);if(latest&&latest.fingerprint!==undefined){}else capture('inicio');
  render();window.profitMenteRecovery=engine;
})();