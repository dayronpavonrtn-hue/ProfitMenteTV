(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectMigrationEngine=api.ProfitMenteProjectMigrationEngine;root.PROFITMENTE_PROJECT_VERSION=api.CURRENT_VERSION})(typeof globalThis!=='undefined'?globalThis:this,function(){
const CURRENT_VERSION='1.8';
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
function versionNumber(value){const n=Number.parseFloat(String(value||'0'));return Number.isFinite(n)?n:0}
function uuid(){return globalThis.crypto?.randomUUID?.()||`clip-${Date.now()}-${Math.random().toString(16).slice(2)}`}
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
  c.id=typeof c.id==='string'&&c.id.trim()?c.id.trim():uuid();
  c.track=Math.max(0,Math.min(6,Math.trunc(finite(c.track,0))));
  c.name=typeof c.name==='string'?c.name:String(c.name||'Clip');
  c.start=Math.max(0,Math.min(projectDuration-.05,finite(c.start,0)));
  c.duration=Math.max(.05,Math.min(projectDuration-c.start,finite(c.duration,1)));
  if(c.asset!=null&&typeof c.asset!=='string')c.asset=String(c.asset);
  if(Number.isFinite(Number(c.sourceOffset)))c.sourceOffset=Math.max(0,Number(c.sourceOffset));
  if(Number.isFinite(Number(c.speed)))c.speed=Math.max(.25,Math.min(4,Number(c.speed)));
  return c;
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
    project.clips=Array.isArray(source.clips)?source.clips.filter(c=>c&&typeof c==='object').map(c=>normalizeClip(c,duration)):[];
    if(source.trackState!=null&&(!source.trackState||typeof source.trackState!=='object'||Array.isArray(source.trackState)))delete project.trackState;
    if(versionNumber(fromVersion)<=versionNumber(this.currentVersion))project.version=this.currentVersion;
    else project.version=fromVersion;
    const before=JSON.stringify(source),after=JSON.stringify(project);
    return {project,changed:before!==after,fromVersion,toVersion:project.version};
  }
}
return {ProfitMenteProjectMigrationEngine,CURRENT_VERSION,normalizeMode,normalizeFormat,normalizeClip};
});
