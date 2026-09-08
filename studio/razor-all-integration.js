(()=>{
  if(typeof window==='undefined'||window.ProfitMenteRazorAll)return;
  const $=selector=>document.querySelector(selector);
  const strictNumber=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
    const n=Number(raw);return Number.isFinite(n)?n:null;
  };
  let running=false;
  function status(message){if(typeof setStatus==='function')setStatus(message)}
  function installButton(){
    if($('#razorAllBtn'))return $('#razorAllBtn');
    const split=$('#splitBtn');if(!split?.parentElement)return null;
    const button=document.createElement('button');button.id='razorAllBtn';button.type='button';button.textContent='✂ Todas';button.title='Cortar todos los clips editables que cruzan el cursor (Shift+S)';
    split.insertAdjacentElement('afterend',button);button.addEventListener('click',razorAll);return button;
  }
  function selectedRight(result){
    const selected=window.ProfitMenteEditTools?.selectedId;if(selected===undefined||selected===null)return null;
    const same=window.ProfitMenteClipIdentity?.same||((a,b)=>String(a)===String(b));
    return result.rightByOriginal?.find(item=>same(item.originalId,selected))?.rightId??null;
  }
  function commit(result){
    const right=selectedRight(result);if(right!==null&&window.ProfitMenteEditTools?.select)window.ProfitMenteEditTools.select(right);
    if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(result.time);
    const notes=[];if(result.blocked)notes.push(`${result.blocked} grupo/pista bloqueado${result.blocked===1?'':'s'}`);if(result.misaligned)notes.push(`${result.misaligned} grupo${result.misaligned===1?'':'s'} no alineado${result.misaligned===1?'':'s'}`);
    status(`Corte en todas las pistas · ${result.cuts} clip${result.cuts===1?'':'s'} en ${result.time.toFixed(2)}s${notes.length?' · omitidos: '+notes.join(', '):''}`);
  }
  function razorAll(){
    if(running)return;const time=strictNumber($('#playhead')?.value);if(time===null){status('El cabezal de reproducción no contiene un tiempo válido');return}
    const Engine=window.ProfitMenteRazorAllEngine,Split=window.ProfitMenteSplitEditEngine;if(!Engine||!Split){status('El motor de corte múltiple todavía no está disponible');return}
    running=true;try{
      const result=new Engine(Split).split(project,time,{idFactory:()=>crypto.randomUUID(),groupIdFactory:(side,oldId)=>side==='left'?oldId:crypto.randomUUID()});
      if(result.ok){commit(result);return}
      if(result.reason==='no-crossing'){status('No hay clips que crucen el cursor en este punto');return}
      if(result.reason==='nothing-editable'){const parts=[];if(result.blocked)parts.push('pistas o grupos bloqueados');if(result.misaligned)parts.push('grupos enlazados no alineados');status(`No hay clips editables para cortar${parts.length?' · '+parts.join(' · '):''}`);return}
      if(result.reason==='outside-project'){status('El cursor está fuera de la duración del proyecto');return}
      status('No se pudo completar el corte múltiple porque el proyecto contiene datos inválidos');
    }catch(error){console.error(error);status(`Error al cortar todas las pistas: ${error?.message||error}`)}finally{running=false}
  }
  document.addEventListener('keydown',event=>{
    const active=document.activeElement;if(['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)||active?.isContentEditable)return;
    if(event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key.toLowerCase()==='s'){event.preventDefault();event.stopImmediatePropagation();razorAll()}
  },true);
  installButton();window.addEventListener('profitmente:features-ready',installButton,{once:true});
  window.ProfitMenteRazorAll={run:razorAll,installButton};
})();
