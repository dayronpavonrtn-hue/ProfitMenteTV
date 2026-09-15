(function(root){
  if(typeof root==='undefined'||root.ProfitMenteStartupProjectGuard)return;
  const PRIMARY_KEY='profitmente-project';
  const BACKUP_KEY='profitmente-project-corrupt-backup';
  const LAST_GOOD_KEY='profitmente-project-last-good';
  const FORMATS=new Set(['9:16','16:9','1:1']);
  const MODES=new Set(['Automático','Manual']);
  const FRAME_RATES=new Set([24,30,60]);
  const RENDER_QUALITIES=new Set(['draft','standard','high']);
  const MAX_RENDER_DURATION=21600;
  const MAX_PROJECT_CLIPS=10000;

  function defaultProject(){
    return {version:'1.3',name:'Nuevo video',mode:'Automático',duration:45,format:'9:16',fps:30,renderQuality:'high',clips:[]};
  }

  function numberValue(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text)return null;
    const parsed=Number(text);
    return Number.isFinite(parsed)?parsed:null;
  }

  function validClipContainer(clips){
    if(!Array.isArray(clips)||clips.length>MAX_PROJECT_CLIPS)return false;
    return clips.every(clip=>clip&&typeof clip==='object'&&!Array.isArray(clip));
  }

  function normalizeProject(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    if(value.clips!=null&&!validClipContainer(value.clips))return null;
    const duration=numberValue(value.duration),fps=numberValue(value.fps);
    const renderQuality=typeof value.renderQuality==='string'?value.renderQuality.trim().toLowerCase():'';
    return {
      ...value,
      version:typeof value.version==='string'&&value.version.trim()?value.version:'1.3',
      name:typeof value.name==='string'&&value.name.trim()?value.name:'Nuevo video',
      mode:MODES.has(value.mode)?value.mode:'Automático',
      duration:duration!==null&&duration>0?Math.min(MAX_RENDER_DURATION,Math.max(1,duration)):45,
      format:FORMATS.has(value.format)?value.format:'9:16',
      fps:FRAME_RATES.has(fps)?fps:30,
      renderQuality:RENDER_QUALITIES.has(renderQuality)?renderQuality:'high',
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
    try{storage.setItem(BACKUP_KEY,raw)}catch{return null}
    try{storage.removeItem(PRIMARY_KEY)}catch{return null}
    return BACKUP_KEY;
  }

  function persist(storage,project){
    if(!storage||typeof storage.setItem!=='function')throw new Error('local storage unavailable');
    const serialized=serializeProject(project);
    storage.setItem(PRIMARY_KEY,serialized.raw);
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
      if(!backupKey){
        return {ok:false,empty:false,backupKey:null,error,project:fallback,quarantineFailed:true,preservedCorruptPrimary:true,fallback:true};
      }
      const recovered=recoverLastGood(storage);
      if(recovered)return {ok:true,empty:false,backupKey,error,project:recovered.project,quarantined:true,recoveredLastGood:true,recoveryKey:recovered.recoveryKey};
      return {ok:false,empty:false,backupKey,error,project:fallback,quarantined:true,fallback:true};
    }
  }

  const api={PRIMARY_KEY,BACKUP_KEY,LAST_GOOD_KEY,MAX_RENDER_DURATION,MAX_PROJECT_CLIPS,defaultProject,normalizeProject,isProject,parseStored,serializeProject,persist,recoverLastGood,quarantine,guard};
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
    }else if(result?.quarantineFailed){
      root.__profitmenteStartupRecovered={reason:'corrupt-project-preserved',backupKey:null};
      try{document.documentElement.dataset.projectRecovered='corrupt-preserved'}catch{}
      console.warn('ProfitMente Studio found a corrupt startup project but could not create a backup, so the original value was preserved.',result.error);
    }else if(result?.storageUnavailable){
      root.__profitmenteStartupRecovered={reason:'storage-unavailable',backupKey:null};
      try{document.documentElement.dataset.projectRecovered='storage-unavailable'}catch{}
      console.warn('ProfitMente Studio started with an in-memory project because local storage is unavailable.',result.error);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this);
