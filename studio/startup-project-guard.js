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
  const MAX_VISUAL_KEYFRAMES=2000;
  const MAX_CLIP_ID_LENGTH=128;
  const MAX_MEDIA_ID_LENGTH=128;
  const OPTIONAL_CLIP_NUMBERS={volume:[0,2],sourceVolume:[0,2],positionX:[-100,100],positionY:[-100,100],scale:[.25,3],rotation:[-180,180],opacity:[0,1]};
  const BOOLEAN_CLIP_FIELDS=['muted','disabled','flipX','flipY'];
  const VISUAL_ADJUSTMENT_LIMITS={brightness:[0,300],contrast:[0,300],saturation:[0,300],grayscale:[0,100]};
  const KEYFRAME_EASINGS=new Set(['linear','ease-in','ease-out','ease-in-out','hold']);
  const MOTION_TEXT_STYLES=new Set(['title','label','callout']);
  const MOTION_TEXT_ANIMATIONS=new Set(['none','fade','pop','slide-up']);
  const HEX_COLOR=/^#[0-9a-f]{6}$/i;

  function defaultProject(){return {version:'1.3',name:'Nuevo video',mode:'Automático',duration:45,format:'9:16',fps:30,renderQuality:'high',clips:[]}}
  function numberValue(value){if(typeof value==='number')return Number.isFinite(value)?value:null;if(typeof value!=='string')return null;const text=value.trim();if(!text)return null;const parsed=Number(text);return Number.isFinite(parsed)?parsed:null}
  function validOptionalNumber(clip,key,min,max){if(clip[key]==null)return true;const value=numberValue(clip[key]);return value!==null&&value>=min&&value<=max}
  function validClipId(id){return id==null||(typeof id==='string'&&id.length>0&&id.length<=MAX_CLIP_ID_LENGTH&&id.trim()===id&&!/[\u0000-\u001f\u007f]/.test(id))}
  function validMediaReference(id){if(id==null)return true;if(typeof id==='number')return Number.isFinite(id);return typeof id==='string'&&id.length>0&&id.length<=MAX_MEDIA_ID_LENGTH&&id.trim()===id&&!/[\u0000-\u001f\u007f]/.test(id)}
  function clipIdentityKey(id){if(id==null)return null;const value=id.trim();if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)){const numeric=Number(value);if(Number.isFinite(numeric))return `n:${Object.is(numeric,-0)?0:numeric}`}return `s:${value}`}
  function validVisualAdjustments(clip){if(clip.visualAdjustments==null)return true;const adjustments=clip.visualAdjustments;if(!adjustments||typeof adjustments!=='object'||Array.isArray(adjustments))return false;for(const [key,[min,max]] of Object.entries(VISUAL_ADJUSTMENT_LIMITS)){if(adjustments[key]==null)continue;const value=numberValue(adjustments[key]);if(value===null||value<min||value>max)return false}return true}
  function validVisualKeyframes(clip,duration){if(clip.visualKeyframes==null)return true;const frames=clip.visualKeyframes;if(!Array.isArray(frames)||frames.length>MAX_VISUAL_KEYFRAMES)return false;for(const frame of frames){if(!frame||typeof frame!=='object'||Array.isArray(frame))return false;const time=numberValue(frame.time);if(time===null||time<0||time>duration)return false;for(const [key,min,max] of [['x',-200,200],['y',-200,200],['scale',.1,8],['rotation',-3600,3600],['opacity',0,1]]){if(frame[key]==null)continue;const value=numberValue(frame[key]);if(value===null||value<min||value>max)return false}if(frame.easing!=null&&(typeof frame.easing!=='string'||!KEYFRAME_EASINGS.has(frame.easing.trim().toLowerCase())))return false}return true}
  function validMotionTextState(clip,track){
    if(track!==2)return true;
    if(clip.textStyle!=null&&(typeof clip.textStyle!=='string'||!MOTION_TEXT_STYLES.has(clip.textStyle.trim())))return false;
    if(clip.textAnimation!=null&&(typeof clip.textAnimation!=='string'||!MOTION_TEXT_ANIMATIONS.has(clip.textAnimation.trim())))return false;
    for(const [key,min,max] of [['textX',-45,45],['textY',-45,45],['fontSize',16,84],['boxOpacity',0,1]])if(!validOptionalNumber(clip,key,min,max))return false;
    for(const key of ['textColor','boxColor'])if(clip[key]!=null&&(typeof clip[key]!=='string'||!HEX_COLOR.test(clip[key].trim())))return false;
    if(clip.name!=null&&(typeof clip.name!=='string'||clip.name.length>180))return false;
    return true;
  }
  function validClipEditScalars(clip,projectDuration){const track=numberValue(clip.track),start=numberValue(clip.start),duration=numberValue(clip.duration);if(!validClipId(clip.id)||!validMediaReference(clip.asset))return false;if(track===null||!Number.isInteger(track)||track<0||track>6)return false;if(start===null||start<0||duration===null||duration<=0)return false;const end=start+duration;if(!Number.isFinite(end)||end>MAX_RENDER_DURATION)return false;if(projectDuration!=null&&end>projectDuration+1e-9)return false;if(!validOptionalNumber(clip,'sourceOffset',0,Infinity))return false;if(!validOptionalNumber(clip,'speed',.25,4))return false;for(const [key,[min,max]] of Object.entries(OPTIONAL_CLIP_NUMBERS))if(!validOptionalNumber(clip,key,min,max))return false;if(!validOptionalNumber(clip,'fadeIn',0,duration)||!validOptionalNumber(clip,'fadeOut',0,duration))return false;for(const key of BOOLEAN_CLIP_FIELDS)if(clip[key]!=null&&typeof clip[key]!=='boolean')return false;if(!validVisualAdjustments(clip)||!validVisualKeyframes(clip,duration)||!validMotionTextState(clip,track))return false;return true}
  function validClipContainer(clips,projectDuration){if(!Array.isArray(clips)||clips.length>MAX_PROJECT_CLIPS)return false;const ids=new Set();for(const clip of clips){if(!clip||typeof clip!=='object'||Array.isArray(clip)||!validClipEditScalars(clip,projectDuration))return false;if(clip.id!=null){const identity=clipIdentityKey(clip.id);if(ids.has(identity))return false;ids.add(identity)}}return true}
  function normalizeProject(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const durationExplicit=value.duration!==undefined;
    if(durationExplicit&&value.duration===null)return null;
    const duration=durationExplicit?numberValue(value.duration):45;
    if(durationExplicit&&(duration===null||duration<=0||duration>MAX_RENDER_DURATION))return null;
    const normalizedDuration=durationExplicit?Math.max(1,duration):45;
    if(value.clips!=null&&!validClipContainer(value.clips,normalizedDuration))return null;
    const formatExplicit=value.format!==undefined;
    if(formatExplicit&&(typeof value.format!=='string'||!FORMATS.has(value.format)))return null;
    const fpsExplicit=value.fps!==undefined||value.frameRate!==undefined;
    if((value.fps!==undefined&&value.fps===null)||(value.frameRate!==undefined&&value.frameRate===null))return null;
    const fpsSource=value.fps??value.frameRate;
    const fps=fpsExplicit?numberValue(fpsSource):30;
    if(fpsExplicit&&!FRAME_RATES.has(fps))return null;
    const qualityExplicit=value.renderQuality!==undefined;
    if(qualityExplicit&&(typeof value.renderQuality!=='string'||!RENDER_QUALITIES.has(value.renderQuality.trim().toLowerCase())))return null;
    const renderQuality=qualityExplicit?value.renderQuality.trim().toLowerCase():'high';
    return {...value,version:typeof value.version==='string'&&value.version.trim()?value.version:'1.3',name:typeof value.name==='string'&&value.name.trim()?value.name:'Nuevo video',mode:MODES.has(value.mode)?value.mode:'Automático',duration:normalizedDuration,format:formatExplicit?value.format:'9:16',fps:fpsExplicit?fps:30,renderQuality,clips:Array.isArray(value.clips)?value.clips:[]};
  }
  function isProject(value){return normalizeProject(value)!==null}
  function parseStored(raw){if(raw==null)return null;try{return normalizeProject(JSON.parse(raw))}catch{return null}}
  function serializeProject(project){const normalized=normalizeProject(project);if(!normalized)throw new Error('invalid project structure');return {project:normalized,raw:JSON.stringify(normalized)}}
  function quarantine(storage,raw){if(raw==null)return null;try{storage.setItem(BACKUP_KEY,raw)}catch{return null}try{storage.removeItem(PRIMARY_KEY)}catch{return null}return BACKUP_KEY}
  function persist(storage,project){if(!storage||typeof storage.setItem!=='function')throw new Error('local storage unavailable');const serialized=serializeProject(project);storage.setItem(PRIMARY_KEY,serialized.raw);try{storage.setItem(LAST_GOOD_KEY,serialized.raw)}catch{}return serialized.project}
  function recoverLastGood(storage){let raw;try{raw=storage.getItem(LAST_GOOD_KEY)}catch{return null}const project=parseStored(raw);if(!project)return null;const normalizedRaw=JSON.stringify(project);try{storage.setItem(PRIMARY_KEY,normalizedRaw)}catch{}return {project,raw:normalizedRaw,recoveryKey:LAST_GOOD_KEY}}
  function guard(storage){const fallback=defaultProject();if(!storage||typeof storage.getItem!=='function')return {ok:false,empty:true,backupKey:null,project:fallback,storageUnavailable:true,fallback:true};let raw;try{raw=storage.getItem(PRIMARY_KEY)}catch(error){return {ok:false,empty:false,backupKey:null,error,project:fallback,storageUnavailable:true,fallback:true}}if(raw==null){const recovered=recoverLastGood(storage);if(recovered)return {ok:true,empty:false,backupKey:null,project:recovered.project,recoveredLastGood:true,recoveryKey:recovered.recoveryKey};return {ok:true,empty:true,backupKey:null,project:fallback,fallback:true}}try{const parsed=JSON.parse(raw);const project=normalizeProject(parsed);if(!project)throw new Error('invalid project structure');try{storage.setItem(LAST_GOOD_KEY,JSON.stringify(project))}catch{}return {ok:true,empty:false,backupKey:null,project}}catch(error){const backupKey=quarantine(storage,raw);if(!backupKey)return {ok:false,empty:false,backupKey:null,error,project:fallback,quarantineFailed:true,preservedCorruptPrimary:true,fallback:true};const recovered=recoverLastGood(storage);if(recovered)return {ok:true,empty:false,backupKey,error,project:recovered.project,quarantined:true,recoveredLastGood:true,recoveryKey:recovered.recoveryKey};return {ok:false,empty:false,backupKey,error,project:fallback,quarantined:true,fallback:true}}}
  const api={PRIMARY_KEY,BACKUP_KEY,LAST_GOOD_KEY,MAX_RENDER_DURATION,MAX_PROJECT_CLIPS,MAX_VISUAL_KEYFRAMES,MAX_CLIP_ID_LENGTH,MAX_MEDIA_ID_LENGTH,defaultProject,normalizeProject,isProject,parseStored,serializeProject,persist,recoverLastGood,quarantine,guard};root.ProfitMenteStartupProjectGuard=api;
  if(typeof document!=='undefined'){let result;try{result=guard(root.localStorage)}catch(error){result={ok:false,error,project:defaultProject(),storageUnavailable:true,fallback:true}}root.__profitmenteStartupProjectGuard=result;if(result?.recoveredLastGood){root.__profitmenteStartupRecovered={reason:'last-good-project-recovered',backupKey:result.backupKey||null,recoveryKey:result.recoveryKey||LAST_GOOD_KEY};try{document.documentElement.dataset.projectRecovered='last-good-startup'}catch{}console.warn('ProfitMente Studio recovered the active project from the last known good snapshot.',result.error)}else if(result?.quarantined){root.__profitmenteStartupRecovered={reason:'corrupt-project-storage',backupKey:result.backupKey};try{document.documentElement.dataset.projectRecovered='corrupt-startup'}catch{}console.warn('ProfitMente Studio isolated a corrupt startup project and preserved a backup.',result.error)}else if(result?.quarantineFailed){root.__profitmenteStartupRecovered={reason:'corrupt-project-preserved',backupKey:null};try{document.documentElement.dataset.projectRecovered='corrupt-preserved'}catch{}console.warn('ProfitMente Studio found a corrupt startup project but could not create a backup, so the original value was preserved.',result.error)}else if(result?.storageUnavailable){root.__profitmenteStartupRecovered={reason:'storage-unavailable',backupKey:null};try{document.documentElement.dataset.projectRecovered='storage-unavailable'}catch{}console.warn('ProfitMente Studio started with an in-memory project because local storage is unavailable.',result.error)}}
})(typeof globalThis!=='undefined'?globalThis:this);
