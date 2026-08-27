(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectLibrary=api.ProfitMenteProjectLibrary})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectLibrary{
  constructor(storage,key='profitmente-project-library'){this.storage=storage;this.key=key}
  _read(){try{const v=JSON.parse(this.storage.getItem(this.key)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
  _write(items){this.storage.setItem(this.key,JSON.stringify(items))}
  list(){return this._read().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))}
  save(project){const items=this._read(),copy=structuredClone(project),id=copy.libraryId||crypto.randomUUID(),now=new Date().toISOString();copy.libraryId=id;let row=items.find(x=>x.id===id);if(row){row.name=copy.name||'Sin título';row.updatedAt=now;row.project=copy}else items.push({id,name:copy.name||'Sin título',createdAt:now,updatedAt:now,project:copy});this._write(items);return structuredClone(copy)}
  load(id){const row=this._read().find(x=>x.id===id);return row?structuredClone(row.project):null}
  remove(id){const before=this._read(),after=before.filter(x=>x.id!==id);this._write(after);return after.length!==before.length}
}
return {ProfitMenteProjectLibrary};
});

if(typeof document!=='undefined')(()=>{
  const $=s=>document.querySelector(s),aside=$('aside');if(!aside||typeof project==='undefined')return;
  const lib=new ProfitMenteProjectLibrary(localStorage),section=document.createElement('section');section.className='projectLibrary';section.innerHTML='<h3>Mis proyectos</h3><div class="projectLibraryActions"><button id="librarySaveBtn">＋ Guardar proyecto</button><button id="libraryRefreshBtn">↻ Actualizar</button></div><div id="projectLibraryList" class="projectLibraryList"></div>';aside.insertBefore(section,aside.firstChild);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function render(){const el=$('#projectLibraryList'),rows=lib.list();el.innerHTML=rows.length?'':'<small>Sin proyectos guardados todavía.</small>';for(const row of rows){const card=document.createElement('div');card.className='projectLibraryCard';card.innerHTML=`<button class="projectOpen" data-open="${row.id}"><b>${escapeHtml(row.name)}</b><small>${new Date(row.updatedAt).toLocaleString()}</small></button><button class="projectDelete" data-delete="${row.id}" title="Eliminar">×</button>`;el.appendChild(card)}}
  function syncAll(){if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof drawLibrary==='function')drawLibrary();if(typeof syncForm==='function')syncForm();$('#playhead').value=0;if(typeof renderAt==='function')renderAt(0)}
  function saveCurrent(){if(typeof save==='function')save();project=lib.save(project);syncAll();render();status('Proyecto guardado en Mis proyectos')}
  function openProject(id){const next=lib.load(id);if(!next)return;project=next;syncAll();if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project);status(`Proyecto abierto: ${project.name||'Sin título'}`)}
  $('#librarySaveBtn').onclick=saveCurrent;$('#libraryRefreshBtn').onclick=render;section.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open)return openProject(open.dataset.open);const del=e.target.closest('[data-delete]');if(del&&confirm('¿Eliminar este proyecto guardado?')){lib.remove(del.dataset.delete);render();status('Proyecto eliminado de la biblioteca')}});render();window.profitMenteProjectLibrary=lib;
  const relink=document.createElement('script');relink.src='relink-engine.js';relink.defer=true;document.body.appendChild(relink);
})();