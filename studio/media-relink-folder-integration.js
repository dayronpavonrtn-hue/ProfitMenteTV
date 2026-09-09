(function integrateFolderRelink(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof project==='undefined'||typeof putAsset!=='function')return;
  if(window.ProfitMenteMediaRelinkFolder)return;
  const Folder=window.ProfitMenteMediaRelinkFolderEngine,Relink=window.ProfitMenteMediaRelinkEngine,Import=window.ProfitMenteMediaImportEngine;
  const library=document.querySelector('#mediaLibrary');if(!Folder||!Relink||!Import||!library)return;
  const host=library.parentElement||library,input=document.createElement('input');input.type='file';input.multiple=true;input.hidden=true;input.id='profitmenteRelinkFolderInput';input.setAttribute('webkitdirectory','');input.setAttribute('directory','');
  const button=document.createElement('button');button.type='button';button.id='profitmenteRelinkFolderButton';button.textContent='📂 Revincular carpeta';button.title='Busca originales faltantes dentro de una carpeta sin reemplazar medios que ya están disponibles';button.style.cssText='width:100%;margin:6px 0;padding:7px 8px;border:1px solid #394250;border-radius:6px;background:#171c24;color:#dce7f5;cursor:pointer;font-size:11px';
  const relinkButton=document.querySelector('#profitmenteRelinkButton');(relinkButton||library).insertAdjacentElement(relinkButton?'afterend':'beforebegin',button);button.insertAdjacentElement('afterend',input);
  const hashFile=async file=>{try{return Import.contentHashes?await Import.contentHashes(file):{current:await Import.contentHash?.(file)||'',legacy:'',version:''}}catch{return {current:'',legacy:'',version:''}}};
  async function relinkFolder(files){
    const compatible=Array.from(files||[]).filter(file=>Import.kind(file)&&Import.hasContent(file)),summary=Folder.summary(project,assets,Relink),candidates=summary.candidates,used=new Set();
    if(!candidates.length){setStatus?.('No hay medios faltantes del proyecto que necesiten revinculación');return {relinked:0,unmatched:compatible.length,ambiguous:0,failed:0,recovered:0,candidates:0}}
    let relinked=0,unmatched=0,ambiguous=0,failed=0,recovered=0;const details=[];
    for(const file of compatible){
      try{
        const hashes=await hashFile(file),match=Folder.bestCandidate(candidates,file,hashes,used,Relink);
        if(match.ambiguous){ambiguous++;details.push({file:file.name,status:'ambiguous'});continue}
        if(!match.candidate){unmatched++;details.push({file:file.name,status:'unmatched'});continue}
        const candidate=match.candidate,result=Relink.apply(candidate.asset,file,hashes);if(!result.ok){failed++;details.push({file:file.name,status:'rejected',reason:result.reason});continue}
        candidate.asset.sourceRelativePath=Import.relativePath(file);await putAsset(candidate.asset);if(candidate.placeholder){Folder.installRecoveredAsset(assets,candidate);recovered++}
        used.add(Folder.key(candidate.asset.id));relinked++;details.push({file:file.name,status:'relinked',assetId:candidate.asset.id,recovered:!!candidate.placeholder,score:match.score})
      }catch(err){failed++;console.error('Error revinculando desde carpeta',file?.name,err)}
    }
    drawLibrary?.();drawTimeline?.();window.ProfitMentePreviewEngine?.clearCache?.();if(typeof renderAt==='function')await renderAt(+document.querySelector('#playhead')?.value||0);persist?.();
    const issues=Relink.sourceWindowIssues(project,assets),parts=[relinked?`${relinked} medio(s) revinculado(s)`:null,recovered?`${recovered} referencia(s) reconstruida(s)`:null,unmatched?`${unmatched} archivo(s) sin coincidencia`:null,ambiguous?`${ambiguous} ambiguo(s)`:null,failed?`${failed} fallo(s)`:null,issues.length?`${issues.length} clip(s) exceden la fuente recuperada`:null].filter(Boolean);
    setStatus?.(parts.join(' · ')||'No se encontraron originales coincidentes');document.dispatchEvent(new CustomEvent('profitmente:media-folder-relinked',{detail:{relinked,unmatched,ambiguous,failed,recovered,issues,details}}));
    return {relinked,unmatched,ambiguous,failed,recovered,issues,details,candidates:candidates.length}
  }
  button.onclick=()=>{const status=Folder.summary(project,assets,Relink);if(!status.total){setStatus?.('Todos los medios referenciados están disponibles');return}input.click()};input.onchange=async e=>{button.disabled=true;try{await relinkFolder(e.target.files)}finally{button.disabled=false;e.target.value=''}};
  window.ProfitMenteMediaRelinkFolder={engine:Folder,relinkFolder,button,input};
})();
