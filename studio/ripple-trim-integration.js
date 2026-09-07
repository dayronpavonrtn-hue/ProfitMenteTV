(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof document==='undefined'||!root.ProfitMenteRippleTrimEngine)return;
  const $=s=>document.querySelector(s),engine=new root.ProfitMenteRippleTrimEngine();
  const selected=()=>root.ProfitMenteEditTools?.selectedId;
  const findClip=id=>root.ProfitMenteClipIdentity?.find?.(id)||(root.project||project)?.clips?.find(c=>c.id===id);
  const playhead=()=>{const value=$('#playhead')?.value;if(typeof value!=='string'&&typeof value!=='number')return null;const n=Number(String(value).trim());return Number.isFinite(n)?n:null};
  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function commit(text){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();if(typeof renderAt==='function')renderAt(playhead()??0);status(text)}
  function addButton(){
    if($('#rippleTrimBtn'))return $('#rippleTrimBtn');
    const button=document.createElement('button');button.id='rippleTrimBtn';button.textContent='⇤ Trim ripple';button.title='Recorta el borde derecho hasta el cursor y cierra el hueco en la misma pista (Alt+])';
    const ref=$('#rippleDeleteBtn')||$('#deleteClipBtn');ref?.parentNode?.insertBefore(button,ref.nextSibling);return button;
  }
  const button=addButton();
  function availability(){
    const clip=findClip(selected()),at=playhead();if(!clip||at===null)return false;
    const start=Number(clip.start),duration=Number(clip.duration);return Number.isFinite(start)&&Number.isFinite(duration)&&duration>0&&at>start+.249&&at<start+duration-.001;
  }
  function update(){if(button)button.disabled=!availability()}
  function trim(){
    const p=root.project||project,id=selected(),at=playhead();
    if(id===undefined||id===null){status('Selecciona un clip para usar Trim ripple');return}
    const result=engine.trimRight(p,id,at);
    if(!result.ok){
      const messages={locked:'No se puede hacer Trim ripple: el clip, la pista o un clip posterior está bloqueado',outside:'Coloca el cursor dentro del clip, lejos de sus bordes',missing:'El clip seleccionado ya no existe','ambiguous-id':'No se puede editar: el ID del clip es ambiguo','invalid-word-timing':'No se puede recortar: hay subtítulos con tiempos inválidos','invalid-clip-window':'No se puede recortar: el timeline contiene tiempos inválidos','invalid-fade':'No se puede recortar: el clip contiene fades inválidos'};
      status(messages[result.reason]||'No se pudo completar Trim ripple sin riesgo para el proyecto');update();return;
    }
    commit(`Trim ripple −${result.shift.toFixed(2)}s · ${result.moved} clip(s) cerraron el hueco`);update();
  }
  button?.addEventListener('click',trim);$('#playhead')?.addEventListener('input',update);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',event=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
    if(event.altKey&&event.key===']'){event.preventDefault();trim()}
  });
  update();root.ProfitMenteRippleTrim=engine;
})();