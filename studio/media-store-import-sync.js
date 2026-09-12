(function(root){
  if(typeof document==='undefined')return;
  let running=null,queued=false;
  function resolveStore(){try{return typeof mediaStore!=='undefined'?mediaStore:null}catch{return null}}
  function refreshActiveLibrary(values){
    try{
      if(typeof assets==='undefined'||!Array.isArray(values))return;
      assets=values;
      if(typeof drawLibrary==='function')drawLibrary();
    }catch(error){console.warn?.('No se pudo refrescar la biblioteca activa después de importar medios',error)}
  }
  async function sync(){
    const store=resolveStore();if(!store||typeof store.refreshFromBackend!=='function')return [];
    if(running){queued=true;return running}
    running=(async()=>{
      let values=[];
      do{queued=false;values=await store.refreshFromBackend()}while(queued);
      refreshActiveLibrary(values);
      return values;
    })();
    try{return await running}finally{running=null}
  }
  document.addEventListener('profitmente:media-imported',()=>{void sync()});
  root.ProfitMenteMediaStoreImportSync={sync,refreshActiveLibrary};
})(typeof window!=='undefined'?window:globalThis);
