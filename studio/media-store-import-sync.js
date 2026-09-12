(function(root){
  if(typeof document==='undefined')return;
  let running=null,queued=false;
  function resolveStore(){try{return typeof mediaStore!=='undefined'?mediaStore:null}catch{return null}}
  async function sync(){
    const store=resolveStore();if(!store||typeof store.refreshFromBackend!=='function')return [];
    if(running){queued=true;return running}
    running=(async()=>{
      let values=[];
      do{queued=false;values=await store.refreshFromBackend()}while(queued);
      return values;
    })();
    try{return await running}finally{running=null}
  }
  document.addEventListener('profitmente:media-imported',()=>{void sync()});
  root.ProfitMenteMediaStoreImportSync={sync};
})(typeof window!=='undefined'?window:globalThis);
