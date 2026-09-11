(()=>{
  if(typeof document==='undefined')return;
  const engine=globalThis.ProfitMenteTimelineRippleEngine;
  if(!engine)return;
  let selectedId=null;
  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function clipFromNode(node){const el=node?.closest?.('.clip');return el&&el.dataset?el:null}
  function markSelected(el){
    document.querySelectorAll('.clip[data-ripple-selected="1"]').forEach(node=>{node.dataset.rippleSelected='0';node.style.outline=''});
    if(!el){selectedId=null;return}
    selectedId=el.dataset.id||null;el.dataset.rippleSelected='1';el.style.outline='2px solid currentColor';
  }
  function apply(){
    if(!selectedId){status('Selecciona un clip para Ripple Delete');return false}
    if(typeof project==='undefined'){status('Proyecto no disponible');return false}
    try{
      if(globalThis.profitMenteAutomationCheckpoint?.checkpoint)globalThis.profitMenteAutomationCheckpoint.checkpoint('Antes de Ripple Delete');
      const result=engine.rippleDelete(project,selectedId,{scope:'track'});
      if(!result.changed){
        status(result.reason==='locked-track'?'Ripple Delete bloqueado: pista protegida':'No se pudo aplicar Ripple Delete');
        return false;
      }
      selectedId=null;
      if(typeof save==='function')save();else{if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline()}
      if(typeof renderAt==='function')renderAt(Number(document.getElementById('playhead')?.value)||0);
      status(`Ripple Delete listo · ${result.shifted} clip${result.shifted===1?'':'s'} desplazado${result.shifted===1?'':'s'}`);
      window.dispatchEvent(new CustomEvent('profitmente:ripple-delete',{detail:result}));
      return true;
    }catch(error){console.error('Ripple Delete falló',error);status('Ripple Delete falló sin modificar más controles');return false}
  }
  function ensureButton(){
    if(document.getElementById('rippleDeleteBtn'))return;
    const anchor=document.getElementById('tracks');if(!anchor)return;
    const btn=document.createElement('button');btn.id='rippleDeleteBtn';btn.type='button';btn.textContent='🧲 Ripple Delete';btn.title='Elimina el clip seleccionado y cierra el hueco en su pista';
    btn.addEventListener('click',apply);
    anchor.parentElement?.insertBefore(btn,anchor);
  }
  document.addEventListener('click',event=>{const el=clipFromNode(event.target);if(el)markSelected(el)},true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Delete'||!event.shiftKey||event.altKey||event.metaKey||event.ctrlKey)return;
    const tag=event.target?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||event.target?.isContentEditable)return;
    event.preventDefault();apply();
  });
  const observer=new MutationObserver(()=>{ensureButton();if(selectedId){const el=[...document.querySelectorAll('.clip')].find(node=>engine.sameId(node.dataset.id,selectedId));if(el)markSelected(el)}});
  observer.observe(document.body,{childList:true,subtree:true});ensureButton();
  globalThis.ProfitMenteTimelineRippleIntegration={apply,markSelected,get selectedId(){return selectedId},observer};
})();
