(()=>{
  if(typeof document==='undefined'||window.ProfitMenteInsertTime)return;
  const Engine=window.ProfitMenteInsertTimeEngine;if(!Engine)return;
  const engine=new Engine();
  const $=s=>document.querySelector(s);
  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function apply(amount){
    if(typeof project==='undefined')return false;
    const at=Math.max(0,Number($('#playhead')?.value)||0),gap=Number(amount);
    const checkpoint=window.profitMenteAutomationCheckpoint?.checkpoint;
    try{checkpoint?.('Antes de insertar tiempo')}catch{}
    const result=engine.insert(project,at,gap);
    if(!result.ok){
      const message=result.reason==='occupied'?'No se puede insertar tiempo dentro de un clip: coloca el cursor en un corte o hueco.':result.reason==='locked'?'No se puede insertar tiempo: hay clips o pistas bloqueadas después del cursor.':result.reason==='invalid_gap'?'La duración a insertar no es válida.':'No se pudo insertar tiempo en este punto.';
      status(message);return false;
    }
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof syncForm==='function')syncForm();
    if(typeof renderAt==='function')renderAt(at);
    status(`Tiempo insertado · +${result.gap.toFixed(2)}s · ${result.moved} clip${result.moved===1?'':'s'} desplazado${result.moved===1?'':'s'}`);
    window.dispatchEvent(new CustomEvent('profitmente:insert-time',{detail:result}));return true;
  }
  function promptApply(){
    const raw=prompt('¿Cuántos segundos quieres insertar?', '1');if(raw===null)return;
    apply(raw);
  }
  function ensureButton(){
    if($('#insertTimeBtn'))return;
    const head=$('.timelineHead');if(!head)return;
    const btn=document.createElement('button');btn.id='insertTimeBtn';btn.type='button';btn.textContent='＋ Insertar tiempo';btn.title='Abre espacio vacío desde el cursor y desplaza todo lo posterior';btn.onclick=promptApply;head.appendChild(btn);
  }
  ensureButton();
  const observer=new MutationObserver(ensureButton);observer.observe(document.body,{childList:true,subtree:true});
  window.ProfitMenteInsertTime={engine,apply,promptApply,observer};
})();
