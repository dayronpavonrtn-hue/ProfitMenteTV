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
class ProfitMenteProjectMigrationEngine{
  constructor(currentVersion=CURRENT_VERSION){this.currentVersion=String(currentVersion||CURRENT_VERSION)}
  migrate(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Proyecto inválido para migración');
    const source=clone(input),fromVersion=String(source.version||'0'),duration=Math.max(1,finite(source.duration,45));
    const project={...source};
    project.name=typeof source.name==='string'&&source.name.trim()?source.name.trim():'Nuevo video';
    project.mode=normalizeMode(source.mode);
    project.duration=duration;
    project.format=normalizeFormat(source.format);
    const sourceClips=Array.isArray(source.clips)?source.clips.filter(c=>c&&typeof c==='object'):[];
    const sourceMarkers=Array.isArray(source.markers)?source.markers.filter(m=>m&&typeof m==='object'):[];
    const repairedClipIds=countIdentityRepairs(sourceClips);
    const repairedMarkerIds=countIdentityRepairs(sourceMarkers);
    project.clips=sourceClips.map(c=>normalizeClip(c,duration));
    ensureUniqueIds(project.clips,'clip');
    if(source.markers!=null)project.markers=normalizeMarkers(source.markers,duration);
    if(source.trackState!=null&&(!source.trackState||typeof source.trackState!=='object'||Array.isArray(source.trackState)))delete project.trackState;
    if(versionNumber(fromVersion)<=versionNumber(this.currentVersion))project.version=this.currentVersion;
    else project.version=fromVersion;
    const before=JSON.stringify(source),after=JSON.stringify(project);
    return {project,changed:before!==after,fromVersion,toVersion:project.version,repairs:{clipIds:repairedClipIds,markerIds:repairedMarkerIds}};
  }
}
return {ProfitMenteProjectMigrationEngine,CURRENT_VERSION,normalizeMode,normalizeFormat,normalizeClip,normalizeMarkers,ensureUniqueIds,countIdentityRepairs};
});
