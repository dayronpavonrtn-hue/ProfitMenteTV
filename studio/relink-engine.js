class ProfitMenteRelinkEngine{
  referenced(project){
    const ids=new Set();
    for(const c of project?.clips||[]) if(c?.asset) ids.add(c.asset);
    return [...ids];
  }
  manifest(assets=[]){
    return (assets||[]).filter(a=>a?.id).map(a=>{
      const row={id:a.id,name:a.name||'',type:a.type||'',mime:a.mime||''};
      for(const key of ['size','duration','width','height','lastModified','metadataVersion']){
        const value=Number(a?.[key]);if(Number.isFinite(value)&&value>=0)row[key]=value;
      }
      if(typeof a?.mediaReadable==='boolean')row.mediaReadable=a.mediaReadable;
      if(a?.fingerprint)row.fingerprint=String(a.fingerprint);
      return row;
    });
  }
  syncManifest(project,assets=[]){
    if(!project||typeof project!=='object')return [];
    const next=this.manifest(assets),previous=new Map((project.assets||[]).map(a=>[a?.id,a]));
    for(const row of next){const old=previous.get(row.id);if(old?.fingerprint&&!row.fingerprint)row.fingerprint=old.fingerprint}
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
  score(expected,file){
    let score=0;
    const en=this.normalize(expected?.name),fn=this.normalize(file?.name),et=expected?.type||String(expected?.mime||'').split('/')[0],ft=this.inferType(file);
    if(et&&ft&&et!==ft)return -1000;
    if(en&&fn&&en===fn)score+=100;
    else if(en&&fn&&(en.includes(fn)||fn.includes(en)))score+=45;
    if(et&&et===ft)score+=25;
    if(expected?.size&&file?.size){const ratio=Math.abs(expected.size-file.size)/Math.max(expected.size,file.size);if(ratio<.002)score+=45;else if(ratio<.01)score+=35;else if(ratio<.08)score+=15;else if(ratio>.35)score-=35}
    if(expected?.lastModified&&file?.lastModified&&Math.abs(Number(expected.lastModified)-Number(file.lastModified))<2000)score+=10;
    return score;
  }
  match(project,assets,files){
    const missing=this.missing(project,assets),remaining=[...(files||[])],matches=[];
    for(const expected of missing){
      let best=-1,bestScore=-Infinity;
      remaining.forEach((file,i)=>{const s=this.score(expected,file);if(s>bestScore){bestScore=s;best=i}});
      // Require more than a type/size coincidence. A safe automatic relink needs
      // a strong filename relationship or an exact-name match, with type enforced.
      if(best>=0&&bestScore>=65){matches.push({expected,file:remaining[best],score:bestScore});remaining.splice(best,1)}
    }
    return {missing,matches,unmatchedMissing:missing.filter(m=>!matches.some(x=>x.expected.id===m.id)),unusedFiles:remaining};
  }
}
if(typeof window!=='undefined')window.ProfitMenteRelinkEngine=ProfitMenteRelinkEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRelinkEngine;

(function integrateRelink(){
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined')return;
  const engine=new ProfitMenteRelinkEngine(),aside=document.querySelector('aside');if(!aside)return;
  const style=document.createElement('style');style.textContent='.clip.missingMedia{outline:2px solid #d96b6b;background:#42252a}.relinkInfo{font-size:11px;color:#f0b5b5;margin:4px 0 8px}.relinkOk{color:#9fd3aa}';document.head.appendChild(style);
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='video/*,image/*,audio/*';input.hidden=true;input.id='relinkInput';
  const button=document.createElement('button');button.id='relinkBtn';button.textContent='🔗 Reconectar medios';button.hidden=true;
  const info=document.createElement('div');info.id='relinkInfo';info.className='relinkInfo';info.hidden=true;
  const anchor=document.querySelector('#importBundleBtn')||document.querySelector('#importBtn');anchor?.insertAdjacentElement('afterend',info);info.insertAdjacentElement('beforebegin',button);button.insertAdjacentElement('beforebegin',input);
  function markMissing(){const missing=engine.missing(project,assets),ids=new Set(missing.map(x=>x.id));document.querySelectorAll('.clip[data-id]').forEach(el=>{const c=(project.clips||[]).find(x=>x.id===el.dataset.id);el.classList.toggle('missingMedia',!!c?.asset&&ids.has(c.asset));if(c?.asset&&ids.has(c.asset))el.title=`Medio faltante: ${missing.find(x=>x.id===c.asset)?.name||c.asset}`});return missing}
  function refresh(){engine.syncManifest(project,assets);const missing=markMissing();button.hidden=!missing.length;info.hidden=!missing.length;if(missing.length){info.className='relinkInfo';info.textContent=`${missing.length} medio${missing.length===1?'':'s'} faltante${missing.length===1?'':'s'}: ${missing.map(x=>x.name||x.id).join(', ')}`}return missing}
  const baseDraw=drawTimeline;drawTimeline=function(){baseDraw();requestAnimationFrame(refresh)};
  const basePersist=typeof persist==='function'?persist:null;
  if(basePersist)persist=function(){engine.syncManifest(project,assets);return basePersist()};
  button.onclick=()=>input.click();
  input.onchange=async e=>{const files=[...e.target.files];if(!files.length)return;const result=engine.match(project,assets,files);if(!result.matches.length){setStatus?.('No encontré coincidencias seguras. Selecciona los archivos originales con sus nombres correctos.');e.target.value='';return}
    let restored=0;
    for(const m of result.matches){const type=engine.inferType(m.file);if(!['video','image','audio'].includes(type))continue;const asset={...m.expected,id:m.expected.id,name:m.expected.name||m.file.name,type,mime:m.file.type||m.expected.mime||'',blob:m.file,size:m.file.size,lastModified:m.file.lastModified||m.expected.lastModified||0};delete asset.mediaReadable;await putAsset(asset);const i=assets.findIndex(a=>a.id===asset.id);if(i>=0)assets[i]=asset;else assets.push(asset);restored++}
    engine.syncManifest(project,assets);if(typeof persist==='function')persist();drawLibrary();drawTimeline();await renderAt(+document.querySelector('#playhead').value||0);const left=refresh();setStatus?.(left.length?`${restored} medios reconectados · todavía faltan ${left.length}`:`${restored} medios reconectados · proyecto completo`);e.target.value=''};
  document.querySelector('#projectInput')?.addEventListener('change',()=>setTimeout(refresh,80));
  document.querySelector('#bundleInput')?.addEventListener('change',()=>setTimeout(refresh,120));
  window.addEventListener('profitmente:project-opened',()=>setTimeout(refresh,0));
  setTimeout(refresh,120);window.profitMenteRelink=engine;
})();