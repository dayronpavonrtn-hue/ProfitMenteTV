(()=>{
  if(typeof document==='undefined'||window.ProfitMenteProjectExport)return;
  const Engine=window.ProfitMenteProjectExportEngine;if(typeof Engine!=='function')return;
  const engine=new Engine();
  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function currentAssets(){try{return typeof assets!=='undefined'&&Array.isArray(assets)?assets:[]}catch{return []}}
  function currentProject(){try{return typeof project!=='undefined'?project:null}catch{return null}}
  function flush(){
    try{if(typeof save==='function')save();else if(typeof persist==='function')persist();return true}
    catch(err){console.error('ProfitMente project export pre-save failed',err);status('No se pudo guardar el proyecto antes de exportar');return false}
  }
  function download(){
    if(!flush())return false;
    const active=currentProject();if(!active){status('No hay un proyecto activo para exportar');return false}
    try{
      const media=currentAssets(),json=engine.serialize(active,media),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`${engine.safeFileName(active.name)}.profitmente.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
      const referenced=engine.projectMedia(active,media).length;status(`Proyecto exportado · ${referenced} medio(s) referenciado(s) con metadata de reconexión · sin copiar archivos pesados`);return true;
    }catch(err){console.error('ProfitMente project export failed',err);status('No se pudo exportar el proyecto: '+(err?.message||err));return false}
  }
  const main=document.querySelector('#exportBtn');if(main)main.onclick=download;
  const library=document.querySelector('#libraryExportBtn');if(library)library.onclick=download;
  window.ProfitMenteProjectExport={engine,download};
})();
