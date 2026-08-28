(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteProjectVersionEngine||typeof project==='undefined')return;
  const engine=new ProfitMenteProjectVersionEngine(localStorage),aside=document.querySelector('aside');if(!aside)return;
  const section=document.createElement('section');section.className='projectVersions';section.innerHTML='<h3>Versiones del proyecto</h3><div class="projectLibraryActions"><button id="versionCreateBtn">⛳ Crear punto de control</button><button id="versionRefreshBtn">↻</button></div><div id="projectVersionList" class="projectLibraryList"></div>';
  const projectLibrary=aside.querySelector('.projectLibrary');if(projectLibrary)projectLibrary.insertAdjacentElement('afterend',section);else aside.insertBefore(section,aside.firstChild);
  const $=s=>document.querySelector(s),status=t=>typeof setStatus==='function'&&setStatus(t);
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function render(){const el=$('#projectVersionList'),rows=engine.list(project);el.innerHTML=rows.length?'':'<small>Sin puntos de control.</small>';for(const row of rows){const card=document.createElement('div');card.className='projectLibraryCard';card.innerHTML=`<button class="projectOpen" data-version-open="${row.id}"><b>${esc(row.label)}</b><small>${new Date(row.createdAt).toLocaleString()}</small></button><button class="projectDelete" data-version-delete="${row.id}" title="Eliminar">×</button>`;el.appendChild(card)}}
  function sync(){if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof drawLibrary==='function')drawLibrary();if(typeof syncForm==='function')syncForm();const p=$('#playhead');if(p)p.value=0;if(typeof renderAt==='function')renderAt(0);if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project)}
  $('#versionCreateBtn').onclick=()=>{if(typeof save==='function')save();const n=engine.list(project).length+1,row=engine.create(project,`Versión ${n}`);render();status(`Punto de control creado: ${row.label}`)};
  $('#versionRefreshBtn').onclick=render;
  section.addEventListener('click',e=>{const open=e.target.closest('[data-version-open]');if(open){const next=engine.restore(project,open.dataset.versionOpen);if(!next)return;const currentId=project.libraryId;project=next;if(currentId&&!project.libraryId)project.libraryId=currentId;sync();render();status('Versión restaurada · puedes deshacer cambios nuevos desde aquí');return}const del=e.target.closest('[data-version-delete]');if(del&&confirm('¿Eliminar este punto de control?')){engine.remove(project,del.dataset.versionDelete);render();status('Punto de control eliminado')}});
  const basePersist=typeof persist==='function'?persist:null;if(basePersist)persist=function(){basePersist();render()};
  render();window.profitMenteProjectVersionEngine=engine;
})();
