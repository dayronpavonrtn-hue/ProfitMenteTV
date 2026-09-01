(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectMigrationEngine=api.ProfitMenteProjectMigrationEngine;root.PROFITMENTE_PROJECT_VERSION=api.CURRENT_VERSION})(typeof globalThis!=='undefined'?globalThis:this,function(){
const CURRENT_VERSION='1.9';
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
function versionNumber(value){const n=Number.parseFloat(String(value||'0'));return Number.isFinite(n)?n:0}
function uuid(prefix='clip'){return globalThis.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function normalizeMode(value){const v=String(value||'').trim().toLowerCase();return v==='automático'||v==='automatico'||v==='automatic'||v==='auto'?'Automático':'Manual'}
function normalizeFormat(value){
  if(['9:16','16:9','1:1'].includes(value))return value;
  if(value&&typeof value==='object'){
    const w=finite(value.width,0),h=finite(value.height,0);
    if(w>0&&h>0){const ratio=w/h;if(Math.abs(ratio-9/16)<.08)return '9:16';if(Math.abs(ratio-16/9)<.12)return '16:9';if(Math.abs(ratio-1)<.08)return '1:1'}
  }
  return '9:16';
}
function contentDuration(clips=[],fallback=1){
  let end=Math.max(1,finite(fallback,1));
  for(const clip of clips){
    if(!clip||typeof clip!=='object')continue;
    const start=Math.max(0,finite(clip.start,0));
    const duration=Math.max(.05,finite(clip.duration,.05));
    end=Math.max(end,start+duration);
  }
  return Number(end.toFixed(3));
}
function normalizeClip(input,projectDuration){
  const c=input&&typeof input==='object'?clone(input):{};
  c.id=typeof c.id==='string'&&c.id.trim()?c.id.trim():uuid('clip');
  c.track=Math.max(0,Math.min(6,Math.trunc(finite(c.track,0))));
  c.name=typeof c.name==='string'?c.name:String(c.name||'Clip');
  c.start=Math.max(0,Math.min(projectDuration-.05,finite(c.start,0)));
  c.duration=Math.max(.05,Math.min(projectDuration-c.start,finite(c.duration,1)));
  if(c.asset!=null&&typeof c.asset!=='string')c.asset=String(c.asset);
  if(Number.isFinite(Number(c.sourceOffset)))c.sourceOffset=Math.max(0,Number(c.sourceOffset));
  if(Number.isFinite(Number(c.speed)))c.speed=Math.max(.25,Math.min(4,Number(c.speed)));
  return c;
}
function countIdentityRepairs(items=[]){
  const seen=new Set();let repaired=0;
  for(const item of items){
    const id=typeof item?.id==='string'?item.id.trim():'';
    if(!id||seen.has(id))repaired+=1;
    else seen.add(id);
  }
  return repaired;
}
function ensureUniqueIds(items,prefix){
  const seen=new Set();let repaired=0;
  for(const item of items){
    let id=typeof item?.id==='string'?item.id.trim():'';
    if(!id||seen.has(id)){
      do{id=uuid(prefix)}while(seen.has(id));
      item.id=id;repaired+=1;
    }else item.id=id;
    seen.add(id);
  }
  return repaired;
}
function normalizeMarkers(input,projectDuration){
  if(!Array.isArray(input))return [];
  const markers=input.filter(m=>m&&typeof m==='object').map(raw=>{
    const m=clone(raw);
    m.id=typeof m.id==='string'&&m.id.trim()?m.id.trim():uuid('marker');
    m.time=Math.max(0,Math.min(projectDuration,finite(m.time,0)));
    m.label=typeof m.label==='string'&&m.label.trim()?m.label.trim().slice(0,80):'Marcador';
    return m;
  });
  ensureUniqueIds(markers,'marker');
  markers.sort((a,b)=>a.time-b.time);
  return markers;
}
function normalizeTrackStateMap(current,legacy){
  const modern=current&&typeof current==='object'&&!Array.isArray(current)?current:{};
  const old=legacy&&typeof legacy==='object'&&!Array.isArray(legacy)?legacy:{};
  const keys=new Set([...Object.keys(old),...Object.keys(modern)]);
  const result={};
  for(const key of keys){
    const legacyState=old[key]&&typeof old[key]==='object'&&!Array.isArray(old[key])?old[key]:{};
    const currentState=modern[key]&&typeof modern[key]==='object'&&!Array.isArray(modern[key])?modern[key]:{};
    const merged={...clone(legacyState),...clone(currentState)};
    for(const flag of ['hidden','muted','locked','solo']){
      if(Boolean(legacyState[flag])||Boolean(currentState[flag]))merged[flag]=true;
      else if(flag in legacyState||flag in currentState)merged[flag]=false;
    }
    if(Object.keys(merged).length)result[key]=merged;
  }
  return result;
}
class ProfitMenteProjectMigrationEngine{
  constructor(currentVersion=CURRENT_VERSION){this.currentVersion=String(currentVersion||CURRENT_VERSION)}
  migrate(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Proyecto inválido para migración');
    const source=clone(input),fromVersion=String(source.version||'0');
    if(versionNumber(fromVersion)>versionNumber(this.currentVersion))throw new Error(`Proyecto v${fromVersion} requiere una versión más nueva de ProfitMente Studio; esta instalación soporta hasta v${this.currentVersion}. El archivo no fue modificado.`);
    const sourceClips=Array.isArray(source.clips)?source.clips.filter(c=>c&&typeof c==='object'):[];
    const sourceMarkers=Array.isArray(source.markers)?source.markers.filter(m=>m&&typeof m==='object'):[];
    const declaredDuration=Math.max(1,finite(source.duration,45));
    const duration=contentDuration(sourceClips,declaredDuration);
    const project={...source};
    project.name=typeof source.name==='string'&&source.name.trim()?source.name.trim():'Nuevo video';
    project.mode=normalizeMode(source.mode);
    project.duration=duration;
    project.format=normalizeFormat(source.format);
    const repairedClipIds=countIdentityRepairs(sourceClips);
    const repairedMarkerIds=countIdentityRepairs(sourceMarkers);
    project.clips=sourceClips.map(c=>normalizeClip(c,duration));
    ensureUniqueIds(project.clips,'clip');
    if(source.markers!=null)project.markers=normalizeMarkers(source.markers,duration);
    const trackState=normalizeTrackStateMap(source.trackState,source.trackStates);
    if(Object.keys(trackState).length)project.trackState=trackState;
    else delete project.trackState;
    delete project.trackStates;
    project.version=this.currentVersion;
    const before=JSON.stringify(source),after=JSON.stringify(project);
    return {project,changed:before!==after,fromVersion,toVersion:project.version,repairs:{clipIds:repairedClipIds,markerIds:repairedMarkerIds,durationExtended:duration>declaredDuration}};
  }
}
return {ProfitMenteProjectMigrationEngine,CURRENT_VERSION,normalizeMode,normalizeFormat,normalizeClip,normalizeMarkers,normalizeTrackStateMap,ensureUniqueIds,countIdentityRepairs,contentDuration};
});
