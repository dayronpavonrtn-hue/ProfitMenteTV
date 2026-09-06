(function(root){
  if(typeof root==='undefined'||root.ProfitMenteStartupProjectGuard)return;
  const PRIMARY_KEY='profitmente-project';
  const BACKUP_KEY='profitmente-project-corrupt-backup';
  const LAST_GOOD_KEY='profitmente-project-last-good';
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

  function parseStored(raw){
    if(raw==null)return null;
    try{return normalizeProject(JSON.parse(raw))}catch{return null}
  }

  function serializeProject(project){
    const normalized=normalizeProject(project);
    if(!normalized)throw new Error('invalid project structure');
    return {project:normalized,raw:JSON.stringify(normalized)};
  }

  function quarantine(storage,raw){
    if(raw==null)return null;
    try{storage.removeItem(PRIMARY_KEY)}catch{}
    try{storage.setItem(BACKUP_KEY,raw);return BACKUP_KEY}catch{return null}
  }

  function persist(storage,project){
    if(!storage||typeof storage.setItem!=='function')throw new Error('local storage unavailable');
    const serialized=serializeProject(project);
    // Commit the active project first. Never advance the recovery snapshot when
    // the primary write itself fails (quota/security/storage errors).
    storage.setItem(PRIMARY_KEY,serialized.raw);
    // A recovery snapshot is best-effort metadata. Failure to refresh it must
    // not turn an already-successful primary save into an application failure.
    try{storage.setItem(LAST_GOOD_KEY,serialized.raw)}catch{}
    return serialized.project;
  }

  function recoverLastGood(storage){
    let raw;
    try{raw=storage.getItem(LAST_GOOD_KEY)}catch{return null}
    const project=parseStored(raw);
    if(!project)return null;
    const normalizedRaw=JSON.stringify(project);
    try{storage.setItem(PRIMARY_KEY,normalizedRaw)}catch{}
    return {project,raw:normalizedRaw,recoveryKey:LAST_GOOD_KEY};
  }

  function guard(storage){
    const fallback=defaultProject();
    if(!storage||typeof storage.getItem!=='function')return {ok:false,empty:true,backupKey:null,project:fallback,storageUnavailable:true,fallback:true};
    let raw;
    try{raw=storage.getItem(PRIMARY_KEY)}catch(error){return {ok:false,empty:false,backupKey:null,error,project:fallback,storageUnavailable:true,fallback:true}}
    if(raw==null){
      const recovered=recoverLastGood(storage);
      if(recovered)return {ok:true,empty:false,backupKey:null,project:recovered.project,recoveredLastGood:true,recoveryKey:recovered.recoveryKey};
      return {ok:true,empty:true,backupKey:null,project:fallback,fallback:true};
    }
    try{
      const parsed=JSON.parse(raw);
      const project=normalizeProject(parsed);
      if(!project)throw new Error('invalid project structure');
      try{storage.setItem(LAST_GOOD_KEY,JSON.stringify(project))}catch{}
      return {ok:true,empty:false,backupKey:null,project};
    }catch(error){
      const backupKey=quarantine(storage,raw);
      const recovered=recoverLastGood(storage);
      if(recovered)return {ok:true,empty:false,backupKey,error,project:recovered.project,quarantined:true,recoveredLastGood:true,recoveryKey:recovered.recoveryKey};
      return {ok:false,empty:false,backupKey,error,project:fallback,quarantined:true,fallback:true};
    }
  }

  const api={PRIMARY_KEY,BACKUP_KEY,LAST_GOOD_KEY,defaultProject,normalizeProject,isProject,parseStored,serializeProject,persist,recoverLastGood,quarantine,guard};
  root.ProfitMenteStartupProjectGuard=api;
  if(typeof document!=='undefined'){
    let result;
    try{result=guard(root.localStorage)}catch(error){result={ok:false,error,project:defaultProject(),storageUnavailable:true,fallback:true}}
    root.__profitmenteStartupProjectGuard=result;
    if(result?.recoveredLastGood){
      root.__profitmenteStartupRecovered={reason:'last-good-project-recovered',backupKey:result.backupKey||null,recoveryKey:result.recoveryKey||LAST_GOOD_KEY};
      try{document.documentElement.dataset.projectRecovered='last-good-startup'}catch{}
      console.warn('ProfitMente Studio recovered the active project from the last known good snapshot.',result.error);
    }else if(result?.quarantined){
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
