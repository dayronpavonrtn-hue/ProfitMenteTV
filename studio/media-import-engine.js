class ProfitMenteMediaImportEngine{
  static extension(name=''){const m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''}
  static kind(file={}){
    const mime=String(file.type||file.mime||'').toLowerCase();
    const top=mime.split('/')[0];if(['video','image','audio'].includes(top))return top;
    const ext=this.extension(file.name||'');
    if(['mp4','mov','m4v','webm','avi','mkv'].includes(ext))return 'video';
    if(['jpg','jpeg','png','webp','gif','bmp','avif'].includes(ext))return 'image';
    if(['mp3','wav','m4a','aac','ogg','opus','flac','webm'].includes(ext))return ext==='webm'?'video':'audio';
    return null;
  }
  static signature(file={}){
    const name=String(file.name||'').trim().toLowerCase(),size=Number(file.size??file.blob?.size??0)||0,mime=String(file.type||file.mime||'').toLowerCase(),modified=Number(file.lastModified??file.sourceLastModified??0)||0;
    return `${name}|${size}|${mime}|${modified}`;
  }
  static compatible(files=[]){return Array.from(files||[]).filter(file=>this.kind(file))}
  static findDuplicate(assets=[],file={}){
    const exact=this.signature(file);return (assets||[]).find(asset=>asset?.sourceFingerprint===exact||this.signature(asset)===exact)||null;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaImportEngine=ProfitMenteMediaImportEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaImportEngine;

(function integrateMediaImport(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function')return;
  const engine=ProfitMenteMediaImportEngine,input=document.querySelector('#mediaInput'),library=document.querySelector('#mediaLibrary'),dropHost=library?.closest('aside')||library;
  if(!input||!library)return;
  if(!document.querySelector('#profitmenteMediaImportStyle')){const style=document.createElement('style');style.id='profitmenteMediaImportStyle';style.textContent='.mediaDropActive{outline:2px dashed #7ad7ff!important;outline-offset:-6px;background:rgba(122,215,255,.06)!important}.mediaDropHint{font-size:9px;color:#7f8795;text-align:center;margin:4px 0 8px}';document.head.appendChild(style)}
  if(!document.querySelector('#mediaDropHint')){const hint=document.createElement('div');hint.id='mediaDropHint';hint.className='mediaDropHint';hint.textContent='Arrastra aquí video, imagen o audio · también puedes pegar archivos con Ctrl/Cmd+V';library.insertAdjacentElement('beforebegin',hint)}
  async function importFiles(files,origin='selector'){
    const incoming=engine.compatible(files),unsupported=Math.max(0,Array.from(files||[]).length-incoming.length);let added=0,duplicates=0,failed=0;
    for(const file of incoming){
      try{
        if(engine.findDuplicate(assets,file)){duplicates++;continue}
        const type=engine.kind(file),fingerprint=engine.signature(file),asset={id:crypto.randomUUID(),name:file.name||`medio-${assets.length+1}`,type,mime:file.type||'',blob:file,sourceFingerprint:fingerprint,sourceLastModified:Number(file.lastModified||0),importOrigin:origin};
        await putAsset(asset);assets.push(asset);added++;
      }catch(err){failed++;console.error('No se pudo importar',file?.name,err)}
    }
    drawLibrary?.();
    const parts=[added?`${added} medio(s) importado(s)`:null,duplicates?`${duplicates} duplicado(s) omitido(s)`:null,unsupported?`${unsupported} archivo(s) no compatibles`:null,failed?`${failed} fallo(s)`:null].filter(Boolean);
    setStatus?.(parts.join(' · ')||'No se encontraron medios compatibles');
    return {added,duplicates,unsupported,failed,total:incoming.length};
  }
  input.onchange=async e=>{try{await importFiles(e.target.files,'selector')}finally{e.target.value=''}};
  const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  let dragDepth=0;
  dropHost?.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();dragDepth++;dropHost.classList.add('mediaDropActive')});
  dropHost?.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy'});
  dropHost?.addEventListener('dragleave',e=>{if(!hasFiles(e))return;dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)dropHost.classList.remove('mediaDropActive')});
  dropHost?.addEventListener('drop',async e=>{if(!hasFiles(e))return;e.preventDefault();dragDepth=0;dropHost.classList.remove('mediaDropActive');await importFiles(e.dataTransfer.files,'drag-drop')});
  document.addEventListener('paste',async e=>{
    const active=document.activeElement;if(active&&(['INPUT','TEXTAREA','SELECT'].includes(active.tagName)||active.isContentEditable))return;
    const files=Array.from(e.clipboardData?.files||[]);if(!files.length)return;
    const compatible=engine.compatible(files);if(!compatible.length)return;e.preventDefault();await importFiles(compatible,'clipboard');
  });
  window.ProfitMenteMediaImport={engine,importFiles};
})();
