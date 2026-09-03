(function(root){
  if(typeof root==='undefined'||root.ProfitMenteStartupProjectGuard)return;
  const PRIMARY_KEY='profitmente-project';
  const BACKUP_KEY='profitmente-project-corrupt-backup';
  function isProject(value){
    return !!value&&typeof value==='object'&&!Array.isArray(value)&&(value.clips==null||Array.isArray(value.clips));
  }
  function quarantine(storage,raw){
    if(raw==null)return null;
    try{storage.removeItem(PRIMARY_KEY)}catch{}
    try{storage.setItem(BACKUP_KEY,raw);return BACKUP_KEY}catch{return null}
  }
  function guard(storage){
    if(!storage||typeof storage.getItem!=='function')return {ok:true,empty:true,backupKey:null};
    let raw;
    try{raw=storage.getItem(PRIMARY_KEY)}catch(error){return {ok:false,empty:false,backupKey:null,error,storageUnavailable:true}}
    if(raw==null)return {ok:true,empty:true,backupKey:null};
    try{
      const project=JSON.parse(raw);
      if(!isProject(project))throw new Error('invalid project structure');
      return {ok:true,empty:false,backupKey:null,project};
    }catch(error){
      const backupKey=quarantine(storage,raw);
      return {ok:false,empty:false,backupKey,error,quarantined:true};
    }
  }
  const api={PRIMARY_KEY,BACKUP_KEY,isProject,quarantine,guard};
  root.ProfitMenteStartupProjectGuard=api;
  if(typeof document!=='undefined'){
    let result;
    try{result=guard(root.localStorage)}catch(error){result={ok:false,error}}
    root.__profitmenteStartupProjectGuard=result;
    if(result?.quarantined){
      root.__profitmenteStartupRecovered={reason:'corrupt-project-storage',backupKey:result.backupKey};
      try{document.documentElement.dataset.projectRecovered='corrupt-startup'}catch{}
      console.warn('ProfitMente Studio isolated a corrupt startup project and preserved a backup.',result.error);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this);
