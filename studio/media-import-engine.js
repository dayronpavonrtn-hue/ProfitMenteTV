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
  static relativePath(file={}){return String(file.sourceRelativePath||file.webkitRelativePath||file.name||'').replace(/^[/\\]+/,'').replace(/\\/g,'/')}
  static compatible(files=[]){return Array.from(files||[]).filter(file=>this.kind(file))}
  static findDuplicate(assets=[],file={}){
    const exact=this.signature(file);return (assets||[]).find(asset=>asset?.sourceFingerprint===exact||this.signature(asset)===exact)||null;
  }
  static async digestParts(parts=[],size=0){
    if(!globalThis.crypto?.subtle)return null;
    const total=parts.reduce((n,p)=>n+p.byteLength,0),payload=new Uint8Array(total+8);let offset=0;
    for(const part of parts){payload.set(part,offset);offset+=part.byteLength}
    new DataView(payload.buffer).setBigUint64(total,BigInt(size),false);
    const digest=await globalThis.crypto.subtle.digest('SHA-256',payload);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  static async contentHashLegacy(file={}){
    const blob=file?.blob instanceof Blob?file.blob:file;
    if(!(blob instanceof Blob)||!globalThis.crypto?.subtle)return null;
    const size=Number(blob.size||0),sample=1024*1024,parts=[];
    if(size<=sample*2)parts.push(new Uint8Array(await blob.arrayBuffer()));
    else{
      parts.push(new Uint8Array(await blob.slice(0,sample).arrayBuffer()));
      parts.push(new Uint8Array(await blob.slice(size-sample,size).arrayBuffer()));
    }
    return this.digestParts(parts,size);
  }
  static async contentHash(file={}){
    const blob=file?.blob instanceof Blob?file.blob:file;
    if(!(blob instanceof Blob)||!globalThis.crypto?.subtle)return null;
    const size=Number(blob.size||0),sample=1024*1024;
    if(size<=sample*2)return this.contentHashLegacy(blob);
    const starts=[0,Math.max(0,Math.floor(size*.25-sample/2)),Math.max(0,Math.floor(size*.5-sample/2)),Math.max(0,Math.floor(size*.75-sample/2)),Math.max(0,size-sample)];
    const unique=[...new Set(starts.map(start=>Math.min(Math.max(0,start),Math.max(0,size-sample))))].sort((a,b)=>a-b),parts=[];
    for(const start of unique)parts.push(new Uint8Array(await blob.slice(start,Math.min(size,start+sample)).arrayBuffer()));
    return this.digestParts(parts,size);
  }
  static async contentHashes(file={}){
    const current=await this.contentHash(file),legacy=await this.contentHashLegacy(file);
    return {current:current||'',legacy:legacy||'',version:'sample-v2'};
  }
  static findDuplicateHash(assets=[],hash=''){return hash?(assets||[]).find(asset=>asset?.sourceContentHash===hash||asset?.sourceLegacyContentHash===hash)||null:null}
  static findDuplicateForImport(assets=[],file={},hash=''){
    // A metadata signature is only a fallback. Folder imports commonly contain
    // different files with identical names, sizes and timestamps, so a content
    // hash must take precedence whenever the browser can compute one.
    return hash?this.findDuplicateHash(assets,hash):this.findDuplicate(assets,file);
  }
  static findDuplicateForHashes(assets=[],file={},hashes={}){
    const current=String(hashes?.current||''),legacy=String(hashes?.legacy||'');
    if(current){
      const modern=this.findDuplicateHash(assets,current);if(modern)return modern;
      // Existing Studio libraries can contain the former first+last-MB hash in
      // sourceContentHash. Check it only as a compatibility path after the
      // stronger v2 hash, never as a reason to collapse two modern v2 assets.
      if(legacy){
        const legacyMatch=(assets||[]).find(asset=>{
          if(asset?.sourceHashVersion==='sample-v2')return asset?.sourceLegacyContentHash===legacy;
          return asset?.sourceContentHash===legacy||asset?.sourceLegacyContentHash===legacy;
        });
        if(legacyMatch)return legacyMatch;
      }
      return null;
    }
    return this.findDuplicate(assets,file);
  }
  static async filesFromDataTransfer(dataTransfer={}){
    const items=Array.from(dataTransfer?.items||[]),entries=items.map(item=>typeof item?.webkitGetAsEntry==='function'?item.webkitGetAsEntry():null).filter(Boolean);
    if(!entries.length)return Array.from(dataTransfer?.files||[]);
    const files=[];
    const attachPath=(file,path)=>{const clean=String(path||file?.name||'').replace(/^[/\\]+/,'').replace(/\\/g,'/');try{Object.defineProperty(file,'sourceRelativePath',{value:clean,configurable:true})}catch{try{file.sourceRelativePath=clean}catch{}}return file};
    const readFile=entry=>new Promise((resolve,reject)=>entry.file(file=>resolve(attachPath(file,entry.fullPath||file.name)),reject));
    const readDirectory=async entry=>{
      const reader=entry.createReader(),children=[];
      while(true){const batch=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!batch?.length)break;children.push(...batch)}
      for(const child of children)await walk(child);
    };
    const walk=async entry=>{if(entry?.isFile)files.push(await readFile(entry));else if(entry?.isDirectory)await readDirectory(entry)};
    for(const entry of entries)await walk(entry);
    return files;
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaImportEngine=ProfitMenteMediaImportEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaImportEngine;

(function integrateMediaImport(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function')return;
  const engine=ProfitMenteMediaImportEngine,input=document.querySelector('#mediaInput'),library=document.querySelector('#mediaLibrary'),dropHost=library?.closest('aside')||library;
  if(!input||!library)return;
  if(!document.querySelector('#profitmenteMediaImportStyle')){const style=document.createElement('style');style.id='profitmenteMediaImportStyle';style.textContent='.mediaDropActive{outline:2px dashed #7ad7ff!important;outline-offset:-6px;background:rgba(122,215,255,.06)!important}.mediaDropHint{font-size:9px;color:#7f8795;text-align:center;margin:4px 0 8px}';document.head.appendChild(style)}
  if(!document.querySelector('#mediaDropHint')){const hint=document.createElement('div');hint.id='mediaDropHint';hint.className='mediaDropHint';hint.textContent='Arrastra archivos o carpetas aquí · también puedes pegar medios con Ctrl/Cmd+V';library.insertAdjacentElement('beforebegin',hint)}
  let folderInput=document.querySelector('#mediaFolderInput');
  if(!folderInput){folderInput=document.createElement('input');folderInput.id='mediaFolderInput';folderInput.type='file';folderInput.multiple=true;folderInput.hidden=true;folderInput.setAttribute('webkitdirectory','');folderInput.setAttribute('directory','');input.insertAdjacentElement('afterend',folderInput)}
  let folderBtn=document.querySelector('#mediaFolderBtn');
  if(!folderBtn){folderBtn=document.createElement('button');folderBtn.id='mediaFolderBtn';folderBtn.type='button';folderBtn.textContent='📁 Importar carpeta';const uploadBtn=document.querySelector('#uploadBtn');uploadBtn?.insertAdjacentElement('afterend',folderBtn)}
  async function importFiles(files,origin='selector'){
    const incoming=engine.compatible(files),unsupported=Math.max(0,Array.from(files||[]).length-incoming.length);let added=0,duplicates=0,failed=0;const addedIds=[];
    for(const file of incoming){
      try{
        const hashes=await engine.contentHashes(file);
        if(engine.findDuplicateForHashes(assets,file,hashes)){duplicates++;continue}
        const type=engine.kind(file),fingerprint=engine.signature(file),relativePath=engine.relativePath(file),asset={id:crypto.randomUUID(),name:file.name||`medio-${assets.length+1}`,type,mime:file.type||'',blob:file,sourceFingerprint:fingerprint,sourceContentHash:hashes.current||'',sourceLegacyContentHash:hashes.legacy||'',sourceHashVersion:hashes.version,sourceLastModified:Number(file.lastModified||0),sourceRelativePath:relativePath,importOrigin:origin};
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
  folderBtn.onclick=()=>folderInput.click();
  folderInput.onchange=async e=>{try{await importFiles(e.target.files,'folder-picker')}finally{e.target.value=''}};
  const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  let dragDepth=0;
  dropHost?.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();dragDepth++;dropHost.classList.add('mediaDropActive')});
  dropHost?.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy'});
  dropHost?.addEventListener('dragleave',e=>{if(!hasFiles(e))return;dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)dropHost.classList.remove('mediaDropActive')});
  dropHost?.addEventListener('drop',async e=>{if(!hasFiles(e))return;e.preventDefault();dragDepth=0;dropHost.classList.remove('mediaDropActive');try{const dropped=await engine.filesFromDataTransfer(e.dataTransfer);await importFiles(dropped,'drag-drop')}catch(err){console.error(err);setStatus?.('No se pudo leer la carpeta o los medios arrastrados')}});
  document.addEventListener('paste',async e=>{
    const active=document.activeElement;if(active&&(['INPUT','TEXTAREA','SELECT'].includes(active.tagName)||active.isContentEditable))return;
    const files=Array.from(e.clipboardData?.files||[]);if(!files.length)return;
    const compatible=engine.compatible(files);if(!compatible.length)return;e.preventDefault();await importFiles(compatible,'clipboard');
  });
  window.ProfitMenteMediaImport={engine,importFiles};
  if(!document.querySelector('script[data-profitmente-media-timeline-dnd]')){const s=document.createElement('script');s.src='media-timeline-dnd.js';s.dataset.profitmenteMediaTimelineDnd='1';document.body.appendChild(s)}
})();
