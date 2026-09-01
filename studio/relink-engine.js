class ProfitMenteRelinkEngine{
  referenced(project){
    const ids=new Set();
    for(const c of project?.clips||[]) if(c?.asset) ids.add(c.asset);
    return [...ids];
  }
  cleanPath(path=''){
    return String(path||'').replace(/^[/\\]+/,'').replace(/\\/g,'/').replace(/\/+/g,'/').toLowerCase();
  }
  filePath(file={}){
    return this.cleanPath(file?.sourceRelativePath||file?.webkitRelativePath||file?.name||'');
  }
  manifest(assets=[]){
    return (assets||[]).filter(a=>a?.id).map(a=>{
      const row={id:a.id,name:a.name||'',type:a.type||'',mime:a.mime||''};
      for(const key of ['size','duration','width','height','lastModified','metadataVersion']){
        const value=Number(a?.[key]);if(Number.isFinite(value)&&value>=0)row[key]=value;
      }
      for(const key of ['sourceRelativePath','sourceContentHash','sourceLegacyContentHash','sourceHashVersion','sourceFingerprint'])if(a?.[key])row[key]=String(a[key]);
      if(typeof a?.mediaReadable==='boolean')row.mediaReadable=a.mediaReadable;
      if(a?.fingerprint)row.fingerprint=String(a.fingerprint);
      return row;
    });
  }
  syncManifest(project,assets=[]){
    if(!project||typeof project!=='object')return [];
    const next=this.manifest(assets),previous=new Map((project.assets||[]).map(a=>[a?.id,a]));
    for(const row of next){
      const old=previous.get(row.id);if(!old)continue;
      for(const key of ['fingerprint','sourceRelativePath','sourceContentHash','sourceLegacyContentHash','sourceHashVersion','sourceFingerprint'])if(old?.[key]&&!row[key])row[key]=old[key];
    }
    project.assets=next;return next;
  }
  missing(project,assets=[]){
    const available=new Set((assets||[]).map(a=>a?.id).filter(Boolean));
    const meta=new Map((project?.assets||[]).map(a=>[a?.id,a]));
    return this.referenced(project).filter(id=>!available.has(id)).map(id=>({id,...(meta.get(id)||{})}));
  }
  normalize(name=''){
    return String(name).toLowerCase().replace(/\.[a-z0-9]{1,8}$/i,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  inferType(file){
    const mime=String(file?.type||'');
    if(mime.startsWith('video/'))return 'video';
    if(mime.startsWith('audio/'))return 'audio';
    if(mime.startsWith('image/'))return 'image';
    const ext=String(file?.name||'').split('.').pop().toLowerCase();
    if(['mp4','mov','webm','mkv','m4v'].includes(ext))return 'video';
    if(['mp3','wav','m4a','aac','ogg','flac'].includes(ext))return 'audio';
    if(['jpg','jpeg','png','webp','gif','avif'].includes(ext))return 'image';
    return 'file';
  }
  async digestParts(parts=[],size=0){
    if(!globalThis.crypto?.subtle)return null;
    const total=parts.reduce((n,p)=>n+p.byteLength,0),payload=new Uint8Array(total+8);let offset=0;
    for(const part of parts){payload.set(part,offset);offset+=part.byteLength}
    new DataView(payload.buffer).setBigUint64(total,BigInt(size),false);
    const digest=await globalThis.crypto.subtle.digest('SHA-256',payload);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  async contentHashLegacy(file={}){
    const blob=file?.blob instanceof Blob?file.blob:file;
    if(typeof Blob==='undefined'||!(blob instanceof Blob)||!globalThis.crypto?.subtle)return null;
    const size=Number(blob.size||0),sample=1024*1024,parts=[];
    if(size<=sample*2)parts.push(new Uint8Array(await blob.arrayBuffer()));
    else{
      parts.push(new Uint8Array(await blob.slice(0,sample).arrayBuffer()));
      parts.push(new Uint8Array(await blob.slice(size-sample,size).arrayBuffer()));
    }
    return this.digestParts(parts,size);
  }
  async contentHash(file={}){
    const blob=file?.blob instanceof Blob?file.blob:file;
    if(typeof Blob==='undefined'||!(blob instanceof Blob)||!globalThis.crypto?.subtle)return null;
    const size=Number(blob.size||0),sample=1024*1024;
    if(size<=sample*2)return this.contentHashLegacy(blob);
    const starts=[0,Math.max(0,Math.floor(size*.25-sample/2)),Math.max(0,Math.floor(size*.5-sample/2)),Math.max(0,Math.floor(size*.75-sample/2)),Math.max(0,size-sample)];
    const unique=[...new Set(starts.map(start=>Math.min(Math.max(0,start),Math.max(0,size-sample))))].sort((a,b)=>a-b),parts=[];
    for(const start of unique)parts.push(new Uint8Array(await blob.slice(start,Math.min(size,start+sample)).arrayBuffer()));
    return this.digestParts(parts,size);
  }
  async contentHashes(file={}){
    const current=await this.contentHash(file),legacy=await this.contentHashLegacy(file);
    return {current:current||'',legacy:legacy||'',version:'sample-v2'};
  }
  score(expected,file){
    let score=0;
    const en=this.normalize(expected?.name),fn=this.normalize(file?.name),et=expected?.type||String(expected?.mime||'').split('/')[0],ft=this.inferType(file);
    if(et&&ft&&et!==ft)return -1000;
    const expectedPath=this.cleanPath(expected?.sourceRelativePath),filePath=this.filePath(file);
    if(expectedPath&&filePath){
      if(expectedPath===filePath)score+=160;
      else if(filePath.endsWith('/'+expectedPath)||expectedPath.endsWith('/'+filePath))score+=95;
      else if(expectedPath.split('/').pop()===filePath.split('/').pop())score+=10;
    }
    const exactName=!!(en&&fn&&en===fn),relatedName=!!(en&&fn&&(exactName||en.includes(fn)||fn.includes(en)));
    if(exactName)score+=100;
    else if(relatedName)score+=45;
    else if(en&&fn)score-=30;
    if(et&&et===ft)score+=25;
    if(expected?.size&&file?.size){
      const ratio=Math.abs(expected.size-file.size)/Math.max(expected.size,file.size);
      if(ratio>.35)return -1000;
      if(ratio<.002)score+=45;else if(ratio<.01)score+=35;else if(ratio<.08)score+=15;
    }
    if(expected?.lastModified&&file?.lastModified&&Math.abs(Number(expected.lastModified)-Number(file.lastModified))<2000)score+=10;
    return score;
  }
  match(project,assets,files){
    const missing=this.missing(project,assets),remaining=[...(files||[])],matches=[];
    for(const expected of missing){
      let best=-1,bestScore=-Infinity;
      remaining.forEach((file,i)=>{const s=this.score(expected,file);if(s>bestScore){bestScore=s;best=i}});
      if(best>=0&&bestScore>=65){matches.push({expected,file:remaining[best],score:bestScore});remaining.splice(best,1)}
    }
    return {missing,matches,unmatchedMissing:missing.filter(m=>!matches.some(x=>x.expected.id===m.id)),unusedFiles:remaining};
  }
  async matchVerified(project,assets,files){
    const missing=this.missing(project,assets),remaining=[...(files||[])],matches=[],hashRejected=[];
    const hashCache=new Map();
    const hashesFor=async file=>{
      if(hashCache.has(file))return hashCache.get(file);
      let hashes=null;try{hashes=await this.contentHashes(file)}catch{}
      hashCache.set(file,hashes);return hashes;
    };
    for(const expected of missing){
      const ranked=remaining.map((file,index)=>({file,index,score:this.score(expected,file)})).filter(x=>x.score>=65).sort((a,b)=>b.score-a.score);
      let accepted=null;
      for(const candidate of ranked){
        let hash=null,hashes=null;
        if(expected?.sourceContentHash){
          hashes=await hashesFor(candidate.file);
          const modern=expected?.sourceHashVersion==='sample-v2';
          hash=modern?hashes?.current:hashes?.legacy;
          if(!hash||hash!==expected.sourceContentHash){hashRejected.push({expected,file:candidate.file,score:candidate.score,reason:hash?'content-hash-mismatch':'content-hash-unavailable'});continue}
        }
        accepted={...candidate,hash,hashes};break;
      }
      if(accepted){matches.push({expected,file:accepted.file,score:accepted.score,hash:accepted.hash,hashes:accepted.hashes});remaining.splice(remaining.indexOf(accepted.file),1)}
    }
    return {missing,matches,hashRejected,unmatchedMissing:missing.filter(m=>!matches.some(x=>x.expected.id===m.id)),unusedFiles:remaining};
  }
}
if(typeof window!=='undefined')window.ProfitMenteRelinkEngine=ProfitMenteRelinkEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRelinkEngine;

(function integrateRelink(){
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined')return;
  const engine=new ProfitMenteRelinkEngine(),aside=document.querySelector('aside');if(!aside)return;
  const style=document.createElement('style');style.textContent='.clip.missingMedia{outline:2px solid #d96b6b;background:#42252a}.relinkInfo{font-size:11px;color:#f0b5b5;margin:4px 0 8px}.relinkOk{color:#9fd3aa}';document.head.appendChild(style);
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='video/*,image/*,audio/*';input.hidden=true;input.id='relinkInput';
  const folderInput=document.createElement('input');folderInput.type='file';folderInput.multiple=true;folderInput.hidden=true;folderInput.id='relinkFolderInput';folderInput.setAttribute('webkitdirectory','');folderInput.setAttribute('directory','');
  const button=document.createElement('button');button.id='relinkBtn';button.textContent='🔗 Reconectar medios';button.hidden=true;
  const folderButton=document.createElement('button');folderButton.id='relinkFolderBtn';folderButton.textContent='📁 Reconectar carpeta';folderButton.hidden=true;
  const info=document.createElement('div');info.id='relinkInfo';info.className='relinkInfo';info.hidden=true;
  const anchor=document.querySelector('#importBundleBtn')||document.querySelector('#importBtn');anchor?.insertAdjacentElement('afterend',info);info.insertAdjacentElement('beforebegin',folderButton);folderButton.insertAdjacentElement('beforebegin',button);button.insertAdjacentElement('beforebegin',folderInput);folderInput.insertAdjacentElement('beforebegin',input);
  function markMissing(){const missing=engine.missing(project,assets),ids=new Set(missing.map(x=>x.id));document.querySelectorAll('.clip[data-id]').forEach(el=>{const c=(project.clips||[]).find(x=>x.id===el.dataset.id);el.classList.toggle('missingMedia',!!c?.asset&&ids.has(c.asset));if(c?.asset&&ids.has(c.asset))el.title=`Medio faltante: ${missing.find(x=>x.id===c.asset)?.name||c.asset}`});return missing}
  function refresh(){engine.syncManifest(project,assets);const missing=markMissing();button.hidden=!missing.length;folderButton.hidden=!missing.length;info.hidden=!missing.length;if(missing.length){info.className='relinkInfo';info.textContent=`${missing.length} medio${missing.length===1?'':'s'} faltante${missing.length===1?'':'s'}: ${missing.map(x=>x.name||x.id).join(', ')}`}return missing}
  const baseDraw=drawTimeline;drawTimeline=function(){baseDraw();requestAnimationFrame(refresh)};
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist)persist=function(){engine.syncManifest(project,assets);return basePersist()};
  async function relinkFiles(files){
    files=[...(files||[])];if(!files.length)return;
    const result=await engine.matchVerified(project,assets,files);if(!result.matches.length){const detail=result.hashRejected?.length?' Los candidatos parecidos no coinciden con la huella del archivo original.':'';setStatus?.(`No encontré coincidencias seguras.${detail} Selecciona los archivos originales o la carpeta raíz donde fueron importados.`);return}
    let restored=0;
    for(const m of result.matches){const type=engine.inferType(m.file);if(!['video','image','audio'].includes(type))continue;const asset={...m.expected,id:m.expected.id,name:m.expected.name||m.file.name,type,mime:m.file.type||m.expected.mime||'',blob:m.file,size:m.file.size,lastModified:m.file.lastModified||m.expected.lastModified||0,sourceRelativePath:engine.filePath(m.file)||m.expected.sourceRelativePath||'',sourceContentHash:m.hash||m.expected.sourceContentHash||'',sourceLegacyContentHash:m.hashes?.legacy||m.expected.sourceLegacyContentHash||'',sourceHashVersion:m.expected.sourceHashVersion||''};delete asset.mediaReadable;await putAsset(asset);const i=assets.findIndex(a=>a.id===asset.id);if(i>=0)assets[i]=asset;else assets.push(asset);restored++}
    engine.syncManifest(project,assets);if(typeof persist==='function')persist();drawLibrary();drawTimeline();await renderAt(+document.querySelector('#playhead').value||0);const left=refresh();setStatus?.(left.length?`${restored} medios reconectados · todavía faltan ${left.length}`:`${restored} medios reconectados · proyecto completo`);
  }
  button.onclick=()=>input.click();folderButton.onclick=()=>folderInput.click();
  input.onchange=async e=>{try{await relinkFiles(e.target.files)}finally{e.target.value=''}};
  folderInput.onchange=async e=>{try{await relinkFiles(e.target.files)}finally{e.target.value=''}};
  document.querySelector('#projectInput')?.addEventListener('change',()=>setTimeout(refresh,80));
  document.querySelector('#bundleInput')?.addEventListener('change',()=>setTimeout(refresh,120));
  window.addEventListener('profitmente:project-opened',()=>setTimeout(refresh,0));
  setTimeout(refresh,120);window.profitMenteRelink=engine;
})();
