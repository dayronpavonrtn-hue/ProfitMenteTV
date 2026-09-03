(function(root){
  if(typeof root==='undefined'||root.ProfitMenteStartupProjectGuard)return;
  const PRIMARY_KEY='profitmente-project';
  const BACKUP_PREFIX='profitmente-project-corrupt-';
  function isProject(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
  function quarantine(storage,raw,now=Date.now()){
    if(!raw)return null;
    const key=BACKUP_PREFIX+now;
    try{storage.setItem(key,raw)}catch{}
    try{storage.removeItem(PRIMARY_KEY)}catch{}
    return key;
  }
  function guard(storage){
    if(!storage||typeof storage.getItem!=='function')return {ok:true,empty:true,backupKey:null};
    let raw;
    try{raw=storage.getItem(PRIMARY_KEY)}catch(err){return {ok:false,empty:false,backupKey:null,error:err,storageUnavailable:true}}
    if(!raw)return {ok:true,empty:true,backupKey:null};
    try{
      const parsed=JSON.parse(raw);
      if(!isProject(parsed))throw new Error('El proyecto guardado no es un objeto válido');
      return {ok:true,empty:false,backupKey:null,project:parsed};
    }catch(error){
      const backupKey=quarantine(storage,raw);
      return {ok:false,empty:false,backupKey,error,quarantined:true};
    }
  }
  const api={PRIMARY_KEY,BACKUP_PREFIX,isProject,quarantine,guard};
  root.ProfitMenteStartupProjectGuard=api;
  if(typeof document!=='undefined'){
    let result;
    try{result=guard(root.localStorage)}catch(error){result={ok:false,error}}
    root.__profitmenteStartupProjectGuard=result;
    if(result?.quarantined){
      try{document.documentElement.dataset.projectRecovered='corrupt-startup'}catch{}
      console.warn('ProfitMente Studio aisló un proyecto local corrupto antes del arranque.',result.error);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this);
