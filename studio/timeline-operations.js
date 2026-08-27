(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteTimelineOperations{
    constructor(){this.clipboard=null}
    cloneClip(clip,start=null){const c=structuredClone(clip);c.id=crypto.randomUUID();c.name=(clip.name||'Clip')+' copia';if(start!==null)c.start=start;return c}
    copy(clip){this.clipboard=structuredClone(clip);return this.clipboard}
    paste(project,at,track=null){if(!this.clipboard)return null;const c=this.cloneClip(this.clipboard);c.track=track??c.track;c.start=Math.max(0,Math.min(Math.max(0,project.duration-c.duration),Number(at)||0));project.clips.push(c);return c}
    rippleDelete(project,id){const c=project.clips.find(x=>x.id===id);if(!c)return null;const shift=c.duration,end=c.start+c.duration,track=c.track;project.clips=project.clips.filter(x=>x.id!==id);for(const x of project.clips){if(x.track===track&&x.start>=end-.001)x.start=Math.max(c.start,x.start-shift)}return c}
    closeGaps(project,track){const clips=project.clips.filter(c=>c.track===track).sort((a,b)=>a.start-b.start);if(!clips.length)return 0;let cursor=0,moved=0;for(const c of clips){if(c.start>cursor+.001){c.start=cursor;moved++}cursor=Math.max(cursor,c.start+c.duration)}return moved}
  }
  root.ProfitMenteTimelineOperations=ProfitMenteTimelineOperations;
  if(typeof document==='undefined')return;
  const ops=new ProfitMenteTimelineOperations(),$=s=>document.querySelector(s);
  const selected=()=>root.ProfitMenteEditTools?.selectedId;
  const clip=()=>project.clips.find(c=>c.id===selected());
  const locked=c=>!!project.trackState?.[c?.track]?.locked;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function commit(t){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+$('#playhead').value||0);status(t)}
  function addButton(id,text,title,after){if($('#'+id))return;const b=document.createElement('button');b.id=id;b.textContent=text;b.title=title;const ref=$(after);ref?.parentNode?.insertBefore(b,ref.nextSibling);return b}
  const copyBtn=addButton('copyClipBtn','⧉ Copiar','Ctrl/Cmd+C','#duplicateBtn');
  const pasteBtn=addButton('pasteClipBtn','📋 Pegar','Ctrl/Cmd+V','#copyClipBtn');
  const rippleBtn=addButton('rippleDeleteBtn','⇤ Borrar ripple','Shift+Delete','#deleteClipBtn');
  const gapBtn=addButton('closeGapsBtn','⇥ Cerrar huecos','G','#rippleDeleteBtn');
  function update(){const c=clip();if(copyBtn)copyBtn.disabled=!c;if(pasteBtn)pasteBtn.disabled=!ops.clipboard;if(rippleBtn)rippleBtn.disabled=!c||locked(c);if(gapBtn)gapBtn.disabled=!c||locked(c)}
  function copySelected(){const c=clip();if(!c)return;ops.copy(c);status(`Clip copiado: ${c.name||'sin nombre'}`);update()}
  function paste(){if(!ops.clipboard)return;const target=clip(),track=target?.track??ops.clipboard.track;if(project.trackState?.[track]?.locked){status('La pista destino está bloqueada');return}const c=ops.paste(project,+$('#playhead').value||0,track);root.ProfitMenteEditTools?.select(c.id);commit(`Clip pegado en ${c.start.toFixed(2)}s`);update()}
  function ripple(){const c=clip();if(!c||locked(c))return;const name=c.name||'clip';ops.rippleDelete(project,c.id);root.ProfitMenteEditTools?.select(null);commit(`Borrado ripple: ${name}`);update()}
  function gaps(){const c=clip();if(!c||locked(c))return;const n=ops.closeGaps(project,c.track);commit(n?`${n} hueco(s) cerrado(s) en la pista`:'La pista ya está compacta');update()}
  copyBtn?.addEventListener('click',copySelected);pasteBtn?.addEventListener('click',paste);rippleBtn?.addEventListener('click',ripple);gapBtn?.addEventListener('click',gaps);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='c'&&clip()){e.preventDefault();copySelected()}else if(mod&&e.key.toLowerCase()==='v'&&ops.clipboard){e.preventDefault();paste()}else if(e.shiftKey&&e.key==='Delete'&&clip()){e.preventDefault();ripple()}else if(!mod&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='g'&&clip()){e.preventDefault();gaps()}});
  update();root.ProfitMenteTimelineOps=ops;
})();