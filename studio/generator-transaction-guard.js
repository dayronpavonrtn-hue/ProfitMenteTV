(()=>{
  const root=typeof window!=='undefined'?window:globalThis;

  class ProfitMenteGeneratorTransactionGuard{
    static clone(value){
      if(typeof structuredClone==='function')return structuredClone(value);
      return JSON.parse(JSON.stringify(value));
    }
    static restore(target,snapshot){
      if(!target||typeof target!=='object'||!snapshot||typeof snapshot!=='object')return target;
      for(const key of Reflect.ownKeys(target))delete target[key];
      for(const key of Reflect.ownKeys(snapshot))target[key]=this.clone(snapshot[key]);
      return target;
    }
    static run(project,operation){
      if(!project||typeof project!=='object')throw new TypeError('Proyecto inválido');
      if(typeof operation!=='function')throw new TypeError('Operación de generación inválida');
      const snapshot=this.clone(project);
      try{return {ok:true,value:operation(),snapshot}}
      catch(error){this.restore(project,snapshot);return {ok:false,error,snapshot}}
    }
  }

  root.ProfitMenteGeneratorTransactionGuard=ProfitMenteGeneratorTransactionGuard;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteGeneratorTransactionGuard;

  if(typeof document==='undefined'||typeof project==='undefined')return;
  const button=document.querySelector('#generateBtn');
  if(!button||button.dataset.generatorTransactionGuard==='1')return;
  const original=button.onclick;
  if(typeof original!=='function')return;

  button.dataset.generatorTransactionGuard='1';
  button.onclick=function(event){
    const result=ProfitMenteGeneratorTransactionGuard.run(project,()=>original.call(this,event));
    if(result.ok)return result.value;

    console.error('ProfitMente Studio: generación automática revertida',result.error);
    try{typeof syncForm==='function'&&syncForm()}catch{}
    try{typeof drawTimeline==='function'&&drawTimeline()}catch{}
    try{
      const playhead=Number(document.querySelector('#playhead')?.value)||0;
      const rendered=typeof renderAt==='function'?renderAt(playhead):null;
      rendered?.catch?.(()=>{});
    }catch{}
    try{typeof updateHistoryButtons==='function'&&updateHistoryButtons()}catch{}
    const message=`Generación cancelada sin alterar el proyecto: ${result.error?.message||'error inesperado'}`;
    try{typeof setStatus==='function'&&setStatus(message)}catch{}
    root.dispatchEvent?.(new CustomEvent('profitmente:generation-rollback',{detail:{message,error:String(result.error?.message||result.error||'')}}));
    return null;
  };

  root.ProfitMenteGeneratorTransactionIntegration={guard:ProfitMenteGeneratorTransactionGuard,button};
})();
