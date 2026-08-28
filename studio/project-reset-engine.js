(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectResetEngine=api.ProfitMenteProjectResetEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectResetEngine{
  constructor({version='1.3'}={}){this.version=version}
  createBlank(options={}){
    const duration=Math.max(1,Number(options.duration)||45);
    const format=['9:16','16:9','1:1'].includes(options.format)?options.format:'9:16';
    const mode=options.mode==='Automático'?'Automático':'Manual';
    return {version:this.version,name:String(options.name||'Nuevo video'),mode,duration,format,clips:[]};
  }
  snapshot(recovery,project,reason='antes de proyecto nuevo'){
    if(!recovery||typeof recovery.capture!=='function'||!project)return null;
    try{return recovery.capture(project,reason)}catch{return null}
  }
  reset(recovery,project,options={}){
    const snapshot=this.snapshot(recovery,project);
    return {snapshot,project:this.createBlank(options)};
  }
}
return {ProfitMenteProjectResetEngine};
});
