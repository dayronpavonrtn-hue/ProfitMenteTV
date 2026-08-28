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
  static async contentHash(file={}){
    const blob=file?.blob instanceof Blob?file.blob:file;
    if(!(blob instanceof Blob)||!globalThis.crypto?.subtle)return null;
    const size=Number(blob.size||0),sample=1024*1024;
    const parts=[];
    if(size<=sample*2)parts.push(new Uint8Array(await blob.arrayBuffer()));
    else{
      parts.push(new Uint8Array(await blob.slice(0,sample).arrayBuffer()));
      parts.push(new Uint8Array(await blob.slice(size-sample,size).arrayBuffer()));
    }
    const total=parts.reduce((n,p)=>n+p.byteLength,0),payload=new Uint8Array(total+8);let offset=0;
    for(const part of parts){payload.set(part,offset);offset+=part.byteLength}
    new DataView(payload.buffer).setBigUint64(total,BigInt(size),false);
    const digest=await globalThis.crypto.subtle.digest('SHA-256',payload);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  static findDuplicateHash(assets=[],hash=''){return hash?(assets||[]).find(asset=>asset?.sourceContentHash===hash)||null:null}
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
    const incoming=engine.compatible(files),unsupported=Math.max(0,Array.from(files||[]).length-incoming.length);let added=0,duplicates=0,failed=0;const addedIds=[];
    for(const file of incoming){
      try{
        if(engine.findDuplicate(assets,file)){duplicates++;continue}
        const contentHash=await engine.contentHash(file);
        if(contentHash&&engine.findDuplicateHash(assets,contentHash)){duplicates++;continue}
        const type=engine.kind(file),fingerprint=engine.signature(file),asset={id:crypto.randomUUID(),name:file.name||`medio-${assets.length+1}`,type,mime:file.type||'',blob:file,sourceFingerprint:fingerprint,sourceContentHash:contentHash||'',sourceLastModified:Number(file.lastModified||0),importOrigin:origin};
        await putAsset(asset);assets.push(asset);addedIds.push(asset.id);added++;
      }catch(err){failed++;console.error('No se pudo importar',file?.name,err)}
    }
    drawLibrary?.();
    if(addedIds.length)document.dispatchEvent(new CustomEvent('profitmente:media-imported',{detail:{assetIds:addedIds,origin}}));
    const parts=[added?`${added} medio(s) importado(s)`:null,duplicates?`${duplicates} duplicado(s) omitido(s)`:null,unsupported?`${unsupported} archivo(s) no compatibles`:null,failed?`${failed} fallo(s)`:null].filter(Boolean);
    setStatus?.(parts.join(' · ')||'No se encontraron medios compatibles');
    return {added,duplicates,unsupported,failed,total:incoming.length,assetIds:addedIds};
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
  if(!document.querySelector('script[data-profitmente-media-timeline-dnd]')){const s=document.createElement('script');s.src='media-timeline-dnd.js';s.dataset.profitmenteMediaTimelineDnd='1';document.body.appendChild(s)}
})();
