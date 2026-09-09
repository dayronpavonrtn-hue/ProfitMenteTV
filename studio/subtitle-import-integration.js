(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteSubtitleImportEngine||window.ProfitMenteSubtitleImport)return;
  const Engine=window.ProfitMenteSubtitleImportEngine,$=s=>document.querySelector(s),anchor=$('#subtitleExportGroup')||$('#captionBtn');if(!anchor)return;
  const btn=document.createElement('button');btn.id='importSubtitleBtn';btn.type='button';btn.textContent='⬆ Importar SRT/VTT';
  anchor.insertAdjacentElement('afterend',btn);
  const input=document.createElement('input');input.type='file';input.accept='.srt,.vtt,text/vtt,application/x-subrip';input.hidden=true;document.body.appendChild(input);
  async function importText(text,name='subtitles'){
    const clips=Engine.clips(text,{source:`subtitle-import:${name}`});
    if(!clips.length)throw new Error('No se encontraron subtítulos válidos en el archivo');
    if(!project||!Array.isArray(project.clips))throw new Error('Proyecto no disponible');
    const snapshot=typeof structuredClone==='function'?structuredClone(project):JSON.parse(JSON.stringify(project));
    try{
      project.clips.push(...clips);
      project.clips.sort((a,b)=>Number(a.start)-Number(b.start)||Number(a.track)-Number(b.track));
      window.ProfitMenteProjectHistory?.capture?.('Importar subtítulos');
      saveProject?.();render?.();renderTimeline?.();
      setStatus?.(`${clips.length} subtítulo(s) importados desde ${name}`);
      window.dispatchEvent(new CustomEvent('profitmente:subtitles-imported',{detail:{count:clips.length,name}}));
      return clips;
    }catch(err){
      if(snapshot&&project){for(const key of Object.keys(project))delete project[key];Object.assign(project,snapshot)}
      throw err;
    }
  }
  input.onchange=async()=>{const file=input.files?.[0];input.value='';if(!file)return;try{await importText(await file.text(),file.name)}catch(err){setStatus?.(`Error importando subtítulos: ${err.message}`)}};
  btn.onclick=()=>input.click();
  window.ProfitMenteSubtitleImport={importText,parse:Engine.parse.bind(Engine),open:()=>input.click()};
})();
