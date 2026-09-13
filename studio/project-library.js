(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectLibrary=api.ProfitMenteProjectLibrary})(typeof globalThis!=='undefined'?globalThis:this,function(){
function libraryIdKey(value){if((typeof value!=='string'&&typeof value!=='number')||typeof value==='boolean')return null;const key=String(value).trim();return key||null}
function sameLibraryId(a,b){const x=libraryIdKey(a),y=libraryIdKey(b);return x!==null&&x===y}
function libraryTimestamp(value){return typeof value==='string'&&value.trim()&&Number.isFinite(Date.parse(value))?value:null}
function strictFiniteNumber(value,fallback=null){if(typeof value==='number')return Number.isFinite(value)?value:fallback;if(typeof value==='string'&&value.trim()!==''){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}return fallback}
class ProfitMenteProjectLibrary{
  constructor(storage,key='profitmente-project-library'){this.storage=storage;this.key=key;this.backupKey=`${key}-last-good`;this.corruptKey=`${key}-corrupt-backup`;this.memory=[];this.storageAvailable=true;this.memoryDirty=false;this.recoveredFromBackup=false;this.quarantinedCorrupt=false;this.repairedCorruptRows=false}
  _clone(items){return structuredClone(Array.isArray(items)?items:[])}
  _parse(raw){if(raw==null)return null;const value=JSON.parse(raw);return Array.isArray(value)?value:null}
  _sanitize(items){
    const clean=[],byId=new Map(),epoch='1970-01-01T00:00:00.000Z';let changed=false;
    for(const row of Array.isArray(items)?items:[]){
      if(!row||typeof row!=='object'||Array.isArray(row)){changed=true;continue}
      const id=libraryIdKey(row.id),validProject=row.project&&typeof row.project==='object'&&!Array.isArray(row.project);
      if(id===null||!validProject){changed=true;continue}
      const copy=structuredClone(row);if(copy.id!==id){copy.id=id;changed=true}
      if(!sameLibraryId(copy.project.libraryId,id)){copy.project.libraryId=id;changed=true}
      const projectName=typeof copy.project.name==='string'&&copy.project.name.trim()?copy.project.name.trim().slice(0,160):null;
      const rowName=typeof copy.name==='string'&&copy.name.trim()?copy.name.trim().slice(0,160):null;
      const name=rowName||projectName||'Sin título';if(copy.name!==name){copy.name=name;changed=true}
      const created=libraryTimestamp(copy.createdAt),updated=libraryTimestamp(copy.updatedAt);
      const safeCreated=created||updated||epoch,safeUpdated=updated||created||safeCreated;
      if(copy.createdAt!==safeCreated){copy.createdAt=safeCreated;changed=true}
      if(copy.updatedAt!==safeUpdated){copy.updatedAt=safeUpdated;changed=true}
      const existingIndex=byId.get(id);
      if(existingIndex!==undefined){
        changed=true;const existing=clean[existingIndex],earliestCreated=copy.createdAt<existing.createdAt?copy.createdAt:existing.createdAt;
        if(copy.updatedAt>existing.updatedAt){copy.createdAt=earliestCreated;clean[existingIndex]=copy}
        else if(existing.createdAt!==earliestCreated)existing.createdAt=earliestCreated;
        continue;
      }
      byId.set(id,clean.length);clean.push(copy);
    }
    return {items:clean,changed};
  }
  _readBackup(){try{const items=this._parse(this.storage.getItem(this.backupKey));if(!Array.isArray(items))return null;return this._sanitize(items).items}catch{return null}}
  _restoreBackup(){const items=this._readBackup();if(!items)return null;const raw=JSON.stringify(items);try{this.storage.setItem(this.key,raw)}catch{}this.memory=this._clone(items);this.storageAvailable=true;this.memoryDirty=false;this.recoveredFromBackup=true;return this._clone(items)}
  _quarantine(raw){if(raw==null)return false;try{this.storage.setItem(this.corruptKey,String(raw));this.quarantinedCorrupt=true;return true}catch{return false}}
  _read(){
    if(this.memoryDirty)return this._clone(this.memory);
    let raw;
    try{raw=this.storage.getItem(this.key)}catch{this.storageAvailable=false;return this._clone(this.memory)}
    if(raw==null){const recovered=this._restoreBackup();if(recovered)return recovered;this.memory=[];this.storageAvailable=true;return []}
    try{
      const items=this._parse(raw);
      if(!items)throw new Error('invalid project library structure');
      const sanitized=this._sanitize(items);
      if(sanitized.changed){this._quarantine(raw);this.repairedCorruptRows=true;this._write(sanitized.items);return this._clone(sanitized.items)}
      this.memory=this._clone(items);this.storageAvailable=true;this.recoveredFromBackup=false;
      return items;
    }catch{
      this._quarantine(raw);
      const recovered=this._restoreBackup();if(recovered)return recovered;
      this.storageAvailable=false;return this._clone(this.memory);
    }
  }
  _write(items){
    this.memory=this._clone(items);const raw=JSON.stringify(items);
    try{
      this.storage.setItem(this.key,raw);
      this.storageAvailable=true;this.memoryDirty=false;this.recoveredFromBackup=false;
      try{this.storage.setItem(this.backupKey,raw)}catch{}
      return true;
    }catch{this.storageAvailable=false;this.memoryDirty=true;return false}
  }
  recoveryState(){return {recoveredFromBackup:this.recoveredFromBackup,repairedCorruptRows:this.repairedCorruptRows,quarantinedCorrupt:this.quarantinedCorrupt,backupKey:this.backupKey,corruptKey:this.corruptKey}}
  list(){return this._read().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))}
  save(project){const items=this._read(),copy=structuredClone(project),id=copy.libraryId||crypto.randomUUID(),now=new Date().toISOString();copy.libraryId=id;let row=items.find(x=>sameLibraryId(x.id,id));if(row){row.name=copy.name||'Sin título';row.updatedAt=now;row.project=copy}else items.push({id,name:copy.name||'Sin título',createdAt:now,updatedAt:now,project:copy});this._write(items);return structuredClone(copy)}
  saveExisting(project){if(libraryIdKey(project?.libraryId)===null)return null;const items=this._read(),row=items.find(x=>sameLibraryId(x.id,project.libraryId));if(!row)return null;const copy=structuredClone(project),now=new Date().toISOString();row.name=copy.name||'Sin título';row.updatedAt=now;row.project=copy;this._write(items);return structuredClone(copy)}
  load(id){const row=this._read().find(x=>sameLibraryId(x.id,id));return row?structuredClone(row.project):null}
  duplicate(id){const items=this._read(),source=items.find(x=>sameLibraryId(x.id,id));if(!source)return null;const copy=structuredClone(source.project||{}),newId=crypto.randomUUID(),now=new Date().toISOString();copy.libraryId=newId;copy.name=`${copy.name||source.name||'Sin título'} · copia`;items.push({id:newId,name:copy.name,createdAt:now,updatedAt:now,project:copy});this._write(items);return structuredClone(copy)}
  remove(id){const before=this._read(),after=before.filter(x=>!sameLibraryId(x.id,id));this._write(after);return after.length!==before.length}
  static blank(){return {version:'1.3',name:'Nuevo video',mode:'Manual',duration:45,format:'9:16',fps:30,clips:[]}}
  static hasMeaningfulTrackState(trackState){
    if(!trackState||typeof trackState!=='object'||Array.isArray(trackState))return false;
    return Object.values(trackState).some(s=>s&&typeof s==='object'&&!Array.isArray(s)&&(
      s.locked===true||s.hidden===true||s.muted===true||s.solo===true||
      s._soloVisualActive===true||s._soloAudioActive===true||
      s._soloHiddenBase===true||s._soloMutedBase===true
    ));
  }
  static hasUnsavedWork(project){
    if(!project||project.libraryId)return false;
    const blank=this.blank(),clips=Array.isArray(project.clips)?project.clips:[];
    if(clips.length)return true;
    if((project.name||blank.name)!==blank.name)return true;
    if((project.mode||blank.mode)!==blank.mode)return true;
    if(strictFiniteNumber(project.duration??blank.duration,null)!==blank.duration)return true;
    if((project.format||blank.format)!==blank.format)return true;
    const fpsValue=project.fps??project.frameRate??blank.fps;
    if(strictFiniteNumber(fpsValue,null)!==blank.fps)return true;
    if(Array.isArray(project.markers)&&project.markers.length)return true;
    if(this.hasMeaningfulTrackState(project.trackState)||this.hasMeaningfulTrackState(project.trackStates))return true;
    if(project.renderRange||project.safeAreaPlatform||project.socialPlatform)return true;
    return false;
  }
  saveDraftIfNeeded(project){return ProfitMenteProjectLibrary.hasUnsavedWork(project)?this.save(project):structuredClone(project)}
  static normalizeImportedProject(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Archivo de proyecto inválido');
    const source=value.kind==='profitmente-studio-project'&&value.project?value.project:value;
    if(!source||typeof source!=='object'||Array.isArray(source))throw new Error('Contenido de proyecto inválido');
    const copy=structuredClone(source);
    if(typeof copy.name!=='string'||!copy.name.trim())copy.name='Proyecto importado';else copy.name=copy.name.trim().slice(0,160);
    const duration=strictFiniteNumber(copy.duration,null);if(duration===null||duration<=0||duration>86400)throw new Error('Duración de proyecto inválida');copy.duration=duration;
    if(!['9:16','16:9','1:1'].includes(copy.format))throw new Error('Formato de proyecto no compatible');
    if(!Array.isArray(copy.clips))throw new Error('Timeline de proyecto inválida');
    for(const clip of copy.clips){
      if(!clip||typeof clip!=='object'||Array.isArray(clip))throw new Error('Clip de proyecto inválido');
      const start=strictFiniteNumber(clip.start??0,null),clipDuration=strictFiniteNumber(clip.duration??0,null);
      if(start===null||start<0||clipDuration===null||clipDuration<0)throw new Error('Tiempo de clip inválido');
      clip.start=start;clip.duration=clipDuration;
    }
    delete copy.libraryId;
    return copy;
  }
  static serialize(project){
    const copy=structuredClone(project||{});delete copy.libraryId;
    return JSON.stringify({kind:'profitmente-studio-project',schemaVersion:1,exportedAt:new Date().toISOString(),project:copy},null,2);
  }
  importSerialized(text){let parsed;try{parsed=JSON.parse(text)}catch{throw new Error('El archivo no contiene JSON válido')}return this.save(ProfitMenteProjectLibrary.normalizeImportedProject(parsed))}
}
ProfitMenteProjectLibrary.sameId=sameLibraryId;
return {ProfitMenteProjectLibrary};
});

if(typeof document!=='undefined')(()=>{
  const $=s=>document.querySelector(s),aside=$('aside');if(!aside||typeof project==='undefined')return;
  const lib=new ProfitMenteProjectLibrary(localStorage),section=document.createElement('section');section.className='projectLibrary';section.innerHTML='<h3>Mis proyectos</h3><div class="projectLibraryActions"><button id="librarySaveBtn">＋ Guardar proyecto</button><button id="libraryExportBtn" title="Exportar respaldo JSON">⇩ Exportar</button><button id="libraryImportBtn" title="Importar respaldo JSON">⇧ Importar</button><button id="libraryRefreshBtn">↻ Actualizar</button><input id="libraryImportFile" type="file" accept="application/json,.json" hidden></div><div id="projectLibraryList" class="projectLibraryList"></div>';aside.insertBefore(section,aside.firstChild);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function persistenceStatus(ok,normal,fallback){status(ok?normal:fallback)}
  function render(){
    const el=$('#projectLibraryList'),rows=lib.list();el.replaceChildren();
    if(!rows.length){const empty=document.createElement('small');empty.textContent='Sin proyectos guardados todavía.';el.appendChild(empty);return}
    for(const row of rows){
      const card=document.createElement('div');card.className='projectLibraryCard';
      const open=document.createElement('button');open.className='projectOpen';open.dataset.open=String(row.id??'');
      const title=document.createElement('b');title.textContent=String(row.name||'Sin título');
      const updated=document.createElement('small');updated.textContent=new Date(row.updatedAt).toLocaleString();open.append(title,updated);
      const duplicate=document.createElement('button');duplicate.className='projectDuplicate';duplicate.dataset.duplicate=String(row.id??'');duplicate.title='Duplicar proyecto';duplicate.textContent='⧉';
      const del=document.createElement('button');del.className='projectDelete';del.dataset.delete=String(row.id??'');del.title='Eliminar';del.textContent='×';
      card.append(open,duplicate,del);el.appendChild(card);
    }
  }
  async function syncAll(){if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof drawLibrary==='function')drawLibrary();if(typeof syncForm==='function')syncForm();const ph=$('#playhead');if(ph)ph.value=0;if(typeof renderAt==='function')await renderAt(0)}
  function stopPlayback(){
    try{if(typeof playing!=='undefined')playing=false}catch{}
    try{if(typeof audio!=='undefined'&&audio?.stop)audio.stop()}catch{}
    try{if(typeof playTimer!=='undefined'&&playTimer)cancelAnimationFrame(playTimer)}catch{}
    const playBtn=$('#playBtn');if(playBtn)playBtn.textContent='▶ Preview';
  }
  function flushCurrentProject(){
    try{
      if(window.ProfitMenteProjectAutosave?.flush)window.ProfitMenteProjectAutosave.flush('cambio de proyecto');
      const name=$('#projectName'),duration=$('#duration'),format=$('#format');
      if(name)project.name=name.value||'Nuevo video';
      if(duration)project.duration=Math.max(1,+duration.value||45);
      if(format)project.format=format.value;
      if(typeof mode!=='undefined'&&mode)project.mode=mode.value;
      if(typeof persist==='function')persist();
      if(!project.libraryId&&ProfitMenteProjectLibrary.hasUnsavedWork(project)){
        project=lib.saveDraftIfNeeded(project);
        if(typeof originalPersist==='function')originalPersist();
        render();
      }
      return true;
    }catch(err){console.error('ProfitMente project flush failed',err);status('No se pudo guardar el proyecto actual; cambio cancelado');return false}
  }
  async function saveCurrent(){if(typeof save==='function')save();project=lib.save(project);await syncAll();render();persistenceStatus(lib.storageAvailable,'Proyecto guardado en Mis proyectos · autoguardado activo','Proyecto guardado solo en esta sesión · almacenamiento del navegador no disponible')}
  function resetHistory(){if(window.ProfitMenteProjectHistory?.reset)window.ProfitMenteProjectHistory.reset();else if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project)}
  async function openProject(id){stopPlayback();if(!flushCurrentProject())return;const next=lib.load(id);if(!next){status('No se pudo abrir el proyecto');return}project=next;await syncAll();resetHistory();window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título'}}));status(`Proyecto abierto: ${project.name||'Sin título'} · autoguardado activo`)}
  async function duplicateProject(id){if(!flushCurrentProject())return;const next=lib.duplicate(id);if(!next){status('No se pudo duplicar el proyecto');return}stopPlayback();project=next;await syncAll();resetHistory();render();window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',duplicated:true}}));status(`Proyecto duplicado y abierto: ${project.name}`)}
  async function newProject(){
    stopPlayback();if(!flushCurrentProject())return false;
    project=ProfitMenteProjectLibrary.blank();
    const qa=$('#qaReport');if(qa){qa.hidden=true;qa.innerHTML=''}
    await syncAll();resetHistory();render();
    window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:null,name:project.name,newProject:true}}));
    persistenceStatus(lib.storageAvailable,'Proyecto nuevo listo · el proyecto anterior quedó guardado','Proyecto nuevo listo · respaldo anterior disponible solo durante esta sesión');return true;
  }
  function safeFileName(name){return String(name||'profitmente-project').normalize('NFKD').replace(/[^\w\-. ]+/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'profitmente-project'}
  function exportCurrent(){
    if(!flushCurrentProject())return;
    const json=ProfitMenteProjectLibrary.serialize(project),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${safeFileName(project.name)}.profitmente.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);status('Respaldo del proyecto exportado')
  }
  async function importProjectFile(file){
    if(!file)return false;if(file.size>10*1024*1024){status('Archivo de proyecto demasiado grande (máximo 10 MB)');return false}
    if(!flushCurrentProject())return false;
    try{const text=await file.text(),next=lib.importSerialized(text);stopPlayback();project=next;await syncAll();resetHistory();render();window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',imported:true}}));persistenceStatus(lib.storageAvailable,`Proyecto importado y abierto: ${project.name}`,`Proyecto importado: ${project.name} · disponible solo durante esta sesión`);return true}catch(err){console.error('ProfitMente project import failed',err);status(`No se pudo importar: ${err?.message||'archivo inválido'}`);return false}
  }
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist){persist=function(){basePersist();const saved=lib.saveExisting(project);if(saved){project=saved;render()}}}
  $('#librarySaveBtn').onclick=()=>{void saveCurrent()};$('#libraryExportBtn').onclick=exportCurrent;$('#libraryImportBtn').onclick=()=>$('#libraryImportFile').click();$('#libraryImportFile').addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';void importProjectFile(file)});$('#libraryRefreshBtn').onclick=render;section.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){void openProject(open.dataset.open);return}const duplicate=e.target.closest('[data-duplicate]');if(duplicate){void duplicateProject(duplicate.dataset.duplicate);return}const del=e.target.closest('[data-delete]');if(del&&confirm('¿Eliminar este proyecto guardado?')){lib.remove(del.dataset.delete);if(ProfitMenteProjectLibrary.sameId(project?.libraryId,del.dataset.delete))delete project.libraryId;render();status('Proyecto eliminado de la biblioteca')}});
  const clearBtn=$('#clearBtn');if(clearBtn)clearBtn.onclick=()=>{if(confirm('¿Crear proyecto nuevo?'))void newProject()};
  render();
  if(lib.recoveredFromBackup){try{document.documentElement.dataset.projectLibraryRecovered='last-good'}catch{}status('Mis proyectos fueron recuperados desde el último respaldo válido');window.dispatchEvent(new CustomEvent('profitmente:project-library-recovered',{detail:lib.recoveryState()}))}
  else if(lib.repairedCorruptRows){try{document.documentElement.dataset.projectLibraryRecovered='repaired'}catch{}status('Mis proyectos válidos fueron conservados y la biblioteca dañada fue reparada');window.dispatchEvent(new CustomEvent('profitmente:project-library-recovered',{detail:lib.recoveryState()}))}
  window.profitMenteProjectLibrary=lib;window.ProfitMenteNewProject={create:newProject,flushCurrentProject};window.ProfitMenteProjectTransfer={exportCurrent,importProjectFile};
})();