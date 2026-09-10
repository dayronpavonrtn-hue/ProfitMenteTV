(()=>{
  const root=typeof window!=='undefined'?window:globalThis,Engine=root.ProfitMenteVisualKeyframeEngine;
  if(!Engine||typeof document==='undefined'||root.ProfitMenteVisualKeyframes)return;
  const canvas=document.querySelector('#previewCanvas'),props=document.querySelector('.props');if(!canvas||!props)return;
  const engine=new Engine(),ctx=canvas.getContext('2d'),$=s=>document.querySelector(s);
  const section=document.createElement('section');section.className='visualKeyframePanel';section.innerHTML=`<hr><h3>Keyframes visuales</h3><div class="ciGrid"><label>X %<input id="vkX" type="number" min="-200" max="200" step="1" value="0"></label><label>Y %<input id="vkY" type="number" min="-200" max="200" step="1" value="0"></label><label>Escala<input id="vkScale" type="number" min="0.1" max="8" step="0.05" value="1"></label><label>Rotación °<input id="vkRotation" type="number" min="-3600" max="3600" step="1" value="0"></label><label>Opacidad<input id="vkOpacity" type="number" min="0" max="1" step="0.05" value="1"></label></div><div class="ciActions"><button id="vkSet">◆ Añadir / actualizar</button><button id="vkRemove">Quitar keyframe</button><button id="vkClear">Restablecer</button></div><small id="vkInfo"></small>`;props.appendChild(section);
  const inputs={x:$('#vkX'),y:$('#vkY'),scale:$('#vkScale'),rotation:$('#vkRotation'),opacity:$('#vkOpacity')},setBtn=$('#vkSet'),removeBtn=$('#vkRemove'),clearBtn=$('#vkClear'),info=$('#vkInfo');
  const selectedId=()=>root.ProfitMenteEditTools?.selectedId??null;
  const scalar=v=>{if(typeof v==='number')return Number.isFinite(v)?String(v):null;if(typeof v!=='string')return null;const s=v.trim();return s||null};
  const idKey=v=>{const s=scalar(v);if(s===null)return null;if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){const n=Number(s);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}return `s:${s}`};
  const sameId=(a,b)=>{const x=idKey(a),y=idKey(b);return x!==null&&x===y};
  const selectedClip=()=>project?.clips?.find(c=>sameId(c?.id,selectedId()))||null;
  const playhead=()=>{const n=Number($('#playhead')?.value);return Number.isFinite(n)?n:0};
  const localTime=clip=>Math.max(0,Math.min(Number(clip?.duration)||0,playhead()-(Number(clip?.start)||0)));
  function inputState(){return {x:inputs.x.value,y:inputs.y.value,scale:inputs.scale.value,rotation:inputs.rotation.value,opacity:inputs.opacity.value}}
  function fill(state){for(const key of Object.keys(inputs))inputs[key].value=Number(state[key]).toFixed(key==='scale'||key==='opacity'?2:1).replace(/\.0+$/,'')}
  function refresh(){
    const clip=selectedClip(),eligible=engine.eligible(clip),locked=eligible&&engine.clipLocked(project,clip);section.dataset.active=eligible?'1':'0';
    for(const el of [...Object.values(inputs),setBtn,removeBtn,clearBtn])el.disabled=!eligible||locked;
    if(!eligible){info.textContent='Selecciona un clip visual de Video u Overlays.';fill(engine.state());return}
    const t=localTime(clip),frames=engine.normalize(clip),state=engine.stateAt(clip,t);fill(state);
    info.textContent=locked?'Clip o pista bloqueada.':`${frames.length} keyframe(s) · tiempo local ${t.toFixed(2)} s`;
  }
  function commit(result,label){
    if(!result?.ok){setStatus?.(result?.reason==='locked'?'Keyframes: clip o pista bloqueada':'No se pudo editar el keyframe');refresh();return}
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(playhead())}
    setStatus?.(`${label}${Number.isFinite(result.count)?` · ${result.count} keyframe(s)`:''}`);refresh();
  }
  setBtn.onclick=()=>{const clip=selectedClip();commit(engine.upsert(project,clip,localTime(clip),inputState()),'Keyframe visual guardado')};
  removeBtn.onclick=()=>{const clip=selectedClip();commit(engine.remove(project,clip,localTime(clip)),'Keyframe visual eliminado')};
  clearBtn.onclick=()=>{const clip=selectedClip();commit(engine.clear(project,clip),'Animación visual restablecida')};
  for(const el of Object.values(inputs))el.addEventListener('change',()=>{const clip=selectedClip();if(clip&&engine.eligible(clip))renderAt?.(playhead())});
  document.addEventListener('click',event=>{if(event.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  $('#playhead')?.addEventListener('input',()=>requestAnimationFrame(refresh));
  root.addEventListener?.('profitmente:project-loaded',refresh);root.addEventListener?.('profitmente:project-reset',refresh);

  const originalRender=root.renderAt;
  let rendering=false,pendingTime=null,pendingWaiters=[];
  function activeCandidates(time){
    const t=Number(time)||0;
    return (project?.clips||[]).filter(c=>{
      if(!engine.eligible(c)||c?.asset==null)return false;
      const start=Number(c.start),duration=Number(c.duration);if(!Number.isFinite(start)||!Number.isFinite(duration)||duration<=0||t<start||t>=start+duration)return false;
      const asset=(typeof assets!=='undefined'&&Array.isArray(assets))?assets.find(a=>sameId(a?.id,c.asset)):null;
      return !!asset&&['image','video'].includes(asset.type)&&asset.blob!=null;
    }).sort((a,b)=>(engine.canonicalTrack(a.track)-engine.canonicalTrack(b.track))||(Number(a.start)-Number(b.start)));
  }
  async function performRender(time){
    if(typeof originalRender!=='function')return;
    const t=Number(time)||0,candidates=activeCandidates(t);
    let drawIndex=0;
    const hadDraw=Object.prototype.hasOwnProperty.call(ctx,'drawImage'),previousDraw=ctx.drawImage;
    ctx.drawImage=function(source,...args){
      const clip=candidates[drawIndex++]||null;
      if(!clip)return previousDraw.apply(ctx,[source,...args]);
      const state=engine.stateAt(clip,t-Number(clip.start)),dx=state.x/100*canvas.width,dy=state.y/100*canvas.height;
      ctx.save();ctx.globalAlpha*=state.opacity;ctx.translate(canvas.width/2+dx,canvas.height/2+dy);ctx.rotate(state.rotation*Math.PI/180);ctx.scale(state.scale,state.scale);ctx.translate(-canvas.width/2,-canvas.height/2);
      try{return previousDraw.apply(ctx,[source,...args])}finally{ctx.restore()}
    };
    try{return await originalRender(t)}finally{
      if(hadDraw)ctx.drawImage=previousDraw;else delete ctx.drawImage;
    }
  }
  async function renderWithKeyframes(time){
    const t=Number(time)||0;
    if(rendering){
      pendingTime=t;
      return new Promise((resolve,reject)=>pendingWaiters.push({resolve,reject}));
    }
    rendering=true;let result;
    try{
      let next=t;
      do{pendingTime=null;result=await performRender(next);next=pendingTime}while(next!==null);
      const waiters=pendingWaiters.splice(0);for(const waiter of waiters)waiter.resolve(result);
      return result;
    }catch(error){
      const waiters=pendingWaiters.splice(0);for(const waiter of waiters)waiter.reject(error);
      throw error;
    }finally{rendering=false}
  }
  if(typeof originalRender==='function')root.renderAt=renderWithKeyframes;
  root.ProfitMenteVisualKeyframes={engine,refresh,stateAt:(clip,time)=>engine.stateAt(clip,time),renderWithKeyframes,performRender,activeCandidates,destroy(){section.remove();if(root.renderAt===renderWithKeyframes)root.renderAt=originalRender;delete root.ProfitMenteVisualKeyframes}};
  refresh();
})();
