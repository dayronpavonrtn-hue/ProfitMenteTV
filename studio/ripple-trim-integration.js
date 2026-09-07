(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof document==='undefined'||!root.ProfitMenteRippleTrimEngine)return;
  const $=s=>document.querySelector(s),engine=new root.ProfitMenteRippleTrimEngine();
  const selected=()=>root.ProfitMenteEditTools?.selectedId;
  const findClip=id=>root.ProfitMenteClipIdentity?.find?.(id)||(root.project||project)?.clips?.find(c=>c.id===id);
  const playhead=()=>{const value=$('#playhead')?.value;if(typeof value!=='string'&&typeof value!=='number')return null;const n=Number(String(value).trim());return Number.isFinite(n)?n:null};
  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function commit(text){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();if(typeof renderAt==='function')renderAt(playhead()??0);status(text)}
  function addButton(id,text,title,reference){
    if($(`#${id}`))return $(`#${id}`);
    const button=document.createElement('button');button.id=id;button.textContent=text;button.title=title;
    const ref=$(reference)||$('#rippleDeleteBtn')||$('#deleteClipBtn');ref?.parentNode?.insertBefore(button,ref.nextSibling);return button;
  }
  const rightButton=addButton('rippleTrimBtn','⇤ Ripple final','Recorta el borde derecho hasta el cursor y cierra el hueco en la misma pista (Alt+])','#rippleDeleteBtn');
  const leftButton=addButton('rippleTrimLeftBtn','⇥ Ripple inicio','Recorta el borde izquierdo hasta el cursor, avanza el contenido fuente y cierra el hueco en la misma pista (Alt+[)','#rippleTrimBtn');
  function availability(){
    const clip=findClip(selected()),at=playhead();if(!clip||at===null)return false;
    const start=Number(clip.start),duration=Number(clip.duration);return Number.isFinite(start)&&Number.isFinite(duration)&&duration>0&&at>start+.249&&at<start+duration-.249;
  }
  function update(){const enabled=availability();if(rightButton)rightButton.disabled=!enabled;if(leftButton)leftButton.disabled=!enabled}
  function trim(side){
    const p=root.project||project,id=selected(),at=playhead();
    if(id===undefined||id===null){status('Selecciona un clip para usar Trim ripple');return}
    const result=side==='left'?engine.trimLeft(p,id,at):engine.trimRight(p,id,at);
    if(!result.ok){
      const messages={locked:'No se puede hacer Trim ripple: el clip, la pista o un clip posterior está bloqueado',outside:'Coloca el cursor dentro del clip, lejos de sus bordes',missing:'El clip seleccionado ya no existe','ambiguous-id':'No se puede editar: el ID del clip es ambiguo','invalid-word-timing':'No se puede recortar: hay subtítulos con tiempos inválidos','invalid-clip-window':'No se puede recortar: el timeline contiene tiempos inválidos','invalid-fade':'No se puede recortar: el clip contiene fades inválidos','invalid-speed':'No se puede recortar el inicio: la velocidad del clip es inválida','invalid-source-offset':'No se puede recortar el inicio: el desplazamiento de fuente es inválido'};
      status(messages[result.reason]||'No se pudo completar Trim ripple sin riesgo para el proyecto');update();return;
    }
    const edge=side==='left'?'inicio':'final';commit(`Ripple ${edge} −${result.shift.toFixed(2)}s · ${result.moved} clip(s) cerraron el hueco`);update();
  }
  rightButton?.addEventListener('click',()=>trim('right'));leftButton?.addEventListener('click',()=>trim('left'));$('#playhead')?.addEventListener('input',update);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',event=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
    if(event.altKey&&event.key===']'){event.preventDefault();trim('right')}
    else if(event.altKey&&event.key==='['){event.preventDefault();trim('left')}
  });
  update();root.ProfitMenteRippleTrim=engine;
})();