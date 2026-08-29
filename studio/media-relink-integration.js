(function integrateMediaRelink(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function'||typeof ProfitMenteMediaRelinkEngine==='undefined')return;
  if(window.ProfitMenteMediaRelink)return;
  const engine=ProfitMenteMediaRelinkEngine;
  const library=document.querySelector('#mediaLibrary');if(!library)return;
  const host=library.parentElement||library;
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='video/*,audio/*,image/*';input.hidden=true;input.id='profitmenteRelinkInput';
  const button=document.createElement('button');button.type='button';button.id='profitmenteRelinkButton';button.textContent='🔗 Revincular medios';button.title='Busca archivos originales y conserva los IDs usados por el proyecto';
  button.style.cssText='width:100%;margin:6px 0;padding:7px 8px;border:1px solid #394250;border-radius:6px;background:#171c24;color:#dce7f5;cursor:pointer;font-size:11px';
  host.insertBefore(button,library);host.insertBefore(input,library);
  async function hashFile(file){try{return await ProfitMenteMediaImportEngine?.contentHash?.(file)||''}catch{return ''}}
  async function relinkFiles(files){
    let relinked=0,unmatched=0,ambiguous=0,failed=0;const used=new Set(),details=[];
    for(const file of Array.from(files||[])){
      try{
        const hash=await hashFile(file);let candidates=assets.filter(a=>!used.has(a.id));
        const match=engine.bestMatch(candidates,file,hash);
        if(match.ambiguous){ambiguous++;details.push({file:file.name,status:'ambiguous'});continue}
        if(!match.asset){unmatched++;details.push({file:file.name,status:'unmatched'});continue}
        const result=engine.apply(match.asset,file,hash);if(!result.ok){failed++;continue}
        await putAsset(match.asset);used.add(match.asset.id);relinked++;details.push({file:file.name,status:'relinked',assetId:match.asset.id,score:match.score});
      }catch(err){failed++;console.error('Error revinculando medio',file?.name,err)}
    }
    drawLibrary?.();drawTimeline?.();updatePreview?.();
    const issues=engine.sourceWindowIssues(typeof project!=='undefined'?project:{},assets);
    const parts=[relinked?`${relinked} medio(s) revinculado(s)`:null,unmatched?`${unmatched} sin coincidencia`:null,ambiguous?`${ambiguous} ambiguo(s)`:null,failed?`${failed} fallo(s)`:null,issues.length?`${issues.length} clip(s) exceden la nueva fuente`:null].filter(Boolean);
    setStatus?.(parts.join(' · ')||'No se revincularon medios');
    document.dispatchEvent(new CustomEvent('profitmente:media-relinked',{detail:{relinked,unmatched,ambiguous,failed,issues,details}}));
    return {relinked,unmatched,ambiguous,failed,issues,details};
  }
  button.onclick=()=>input.click();
  input.onchange=async e=>{try{await relinkFiles(e.target.files)}finally{e.target.value=''}};
  window.ProfitMenteMediaRelink={engine,relinkFiles,button,input};
})();
