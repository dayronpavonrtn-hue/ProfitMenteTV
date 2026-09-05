(function(root){
  if(typeof root==='undefined'||root.ProfitMenteStartupProjectGuard)return;
  const PRIMARY_KEY='profitmente-project';
  const BACKUP_KEY='profitmente-project-corrupt-backup';
  const FORMATS=new Set(['9:16','16:9','1:1']);
  const MODES=new Set(['Automático','Manual']);

  function defaultProject(){
    return {version:'1.3',name:'Nuevo video',mode:'Automático',duration:45,format:'9:16',clips:[]};
  }

  function normalizeProject(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    if(value.clips!=null&&!Array.isArray(value.clips))return null;
    const duration=Number(value.duration);
    return {
      ...value,
      version:typeof value.version==='string'&&value.version.trim()?value.version:'1.3',
      name:typeof value.name==='string'&&value.name.trim()?value.name:'Nuevo video',
      mode:MODES.has(value.mode)?value.mode:'Automático',
      duration:Number.isFinite(duration)&&duration>0?Math.max(1,duration):45,
      format:FORMATS.has(value.format)?value.format:'9:16',
      clips:Array.isArray(value.clips)?value.clips:[]
    };
  }

  function isProject(value){return normalizeProject(value)!==null}

  function quarantine(storage,raw){
    if(raw==null)return null;
    try{storage.removeItem(PRIMARY_KEY)}catch{}
    try{storage.setItem(BACKUP_KEY,raw);return BACKUP_KEY}catch{return null}
  }

  function guard(storage){
    const fallback=defaultProject();
    if(!storage||typeof storage.getItem!=='function')return {ok:false,empty:true,backupKey:null,project:fallback,storageUnavailable:true,fallback:true};
    let raw;
    try{raw=storage.getItem(PRIMARY_KEY)}catch(error){return {ok:false,empty:false,backupKey:null,error,project:fallback,storageUnavailable:true,fallback:true}}
    if(raw==null)return {ok:true,empty:true,backupKey:null,project:fallback,fallback:true};
    try{
      const parsed=JSON.parse(raw);
      const project=normalizeProject(parsed);
      if(!project)throw new Error('invalid project structure');
      return {ok:true,empty:false,backupKey:null,project};
    }catch(error){
      const backupKey=quarantine(storage,raw);
      return {ok:false,empty:false,backupKey,error,project:fallback,quarantined:true,fallback:true};
    }
  }

  const api={PRIMARY_KEY,BACKUP_KEY,defaultProject,normalizeProject,isProject,quarantine,guard};
  root.ProfitMenteStartupProjectGuard=api;
  if(typeof document!=='undefined'){
    let result;
    try{result=guard(root.localStorage)}catch(error){result={ok:false,error,project:defaultProject(),storageUnavailable:true,fallback:true}}
    root.__profitmenteStartupProjectGuard=result;
    if(result?.quarantined){
      root.__profitmenteStartupRecovered={reason:'corrupt-project-storage',backupKey:result.backupKey};
      try{document.documentElement.dataset.projectRecovered='corrupt-startup'}catch{}
      console.warn('ProfitMente Studio isolated a corrupt startup project and preserved a backup.',result.error);
    }else if(result?.storageUnavailable){
      root.__profitmenteStartupRecovered={reason:'storage-unavailable',backupKey:null};
      try{document.documentElement.dataset.projectRecovered='storage-unavailable'}catch{}
      console.warn('ProfitMente Studio started with an in-memory project because local storage is unavailable.',result.error);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this);
