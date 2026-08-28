(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteTimelineOperations{
    constructor(){this.clipboard=null}
    cloneClip(clip,start=null){const c=structuredClone(clip);c.id=crypto.randomUUID();c.name=(clip.name||'Clip')+' copia';if(start!==null)c.start=start;return c}
    copy(clip){this.clipboard=structuredClone(clip);return this.clipboard}
    paste(project,at,track=null){if(!this.clipboard)return null;const c=this.cloneClip(this.clipboard);c.track=track??c.track;c.start=Math.max(0,Math.min(Math.max(0,project.duration-c.duration),Number(at)||0));project.clips.push(c);return c}
    split(project,id,at,minDuration=.05){
      const c=project.clips.find(x=>x.id===id);if(!c)return null;
      const start=Number(c.start)||0,duration=Number(c.duration)||0,end=start+duration,cut=Number(at);
      if(!Number.isFinite(cut)||cut<=start+minDuration||cut>=end-minDuration)return null;
      const original=structuredClone(c),leftDuration=cut-start,rightDuration=end-cut,p=duration>0?leftDuration/duration:0;
      const right=structuredClone(original);right.id=crypto.randomUUID();right.start=cut;right.duration=rightDuration;right.name=original.name||'Clip';
      c.duration=leftDuration;
      if(Object.prototype.hasOwnProperty.call(original,'sourceOffset')){
        const speed=Math.max(.25,Math.min(4,Number(original.speed)||1));
        right.sourceOffset=Math.max(0,(Number(original.sourceOffset)||0)+leftDuration*speed);
      }
      // A split is not a new editorial entrance. Keep the original entrance on the left
      // and make the right half a clean continuation.
      if(Object.prototype.hasOwnProperty.call(original,'transition'))right.transition='cut';
      if(original.asset&&[0,1,4,5,6].includes(Number(original.track))){
        const originalFadeIn=original.fadeIn==null?.18:(Number.isFinite(Number(original.fadeIn))?Math.max(0,Number(original.fadeIn)):0);
        const originalFadeOut=original.fadeOut==null?.25:(Number.isFinite(Number(original.fadeOut))?Math.max(0,Number(original.fadeOut)):0);
        c.fadeIn=originalFadeIn;c.fadeOut=0;right.fadeIn=0;right.fadeOut=originalFadeOut;
      }
      const k=original.keyframes;
      if(k&&typeof k==='object'&&k.start&&k.end){
        const mid={};
        for(const key of new Set([...Object.keys(k.start),...Object.keys(k.end)])){
          const a=Number(k.start[key]),b=Number(k.end[key]);
          if(Number.isFinite(a)&&Number.isFinite(b))mid[key]=a+(b-a)*p;
          else if(k.start[key]!==undefined)mid[key]=structuredClone(k.start[key]);
          else mid[key]=structuredClone(k.end[key]);
        }
        c.keyframes={start:structuredClone(k.start),end:structuredClone(mid)};
        right.keyframes={start:structuredClone(mid),end:structuredClone(k.end)};
      }
      if(Array.isArray(original.wordTimings)){
        const leftWords=[],rightWords=[];
        for(const timing of original.wordTimings){
          if(!timing||typeof timing!=='object')continue;
          const ws=Number(timing.start),we=Number(timing.end);
          if(!Number.isFinite(ws)||!Number.isFinite(we)||we<=ws)continue;
          const item=structuredClone(timing),mid=(ws+we)/2;
          if(we<=cut){leftWords.push(item);continue}
          if(ws>=cut){rightWords.push(item);continue}
          if(mid<cut){item.end=cut;item.duration=Math.max(0,cut-ws);leftWords.push(item)}
          else{item.start=cut;item.duration=Math.max(0,we-cut);rightWords.push(item)}
        }
        c.wordTimings=leftWords;right.wordTimings=rightWords;
        if(Number(original.track)===3){
          const text=list=>list.map(x=>String(x.word||'').trim()).filter(Boolean).join(' ');
          const leftText=text(leftWords),rightText=text(rightWords);if(leftText)c.name=leftText;if(rightText)right.name=rightText;
        }
      }
      project.clips.push(right);return {left:c,right};
    }
    rippleDelete(project,id){const c=project.clips.find(x=>x.id===id);if(!c)return null;const shift=c.duration,end=c.start+c.duration,track=c.track;project.clips=project.clips.filter(x=>x.id!==id);for(const x of project.clips){if(x.track===track&&x.start>=end-.001)x.start=Math.max(c.start,x.start-shift)}return c}
    closeGaps(project,track){const clips=project.clips.filter(c=>c.track===track).sort((a,b)=>a.start-b.start);if(!clips.length)return 0;let cursor=0,moved=0;for(const c of clips){if(c.start>cursor+.001){c.start=cursor;moved++}cursor=Math.max(cursor,c.start+c.duration)}return moved}
  }
  root.ProfitMenteTimelineOperations=ProfitMenteTimelineOperations;
  if(typeof document==='undefined')return;
  const ops=new ProfitMenteTimelineOperations(),$=s=>document.querySelector(s);
  const selected=()=>root.ProfitMenteEditTools?.selectedId;
  const clip=()=>project.clips.find(c=>c.id===selected());
  const locked=c=>!!project.trackState?.[c?.track]?.locked;
  const playhead=()=>+$('#playhead')?.value||0;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function commit(t){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(playhead());status(t)}
  function addButton(id,text,title,after){if($('#'+id))return;const b=document.createElement('button');b.id=id;b.textContent=text;b.title=title;const ref=$(after);ref?.parentNode?.insertBefore(b,ref.nextSibling);return b}
  const splitBtn=addButton('splitClipBtn','✂ Dividir','Dividir clip en el cursor (S)','#duplicateBtn');
  const copyBtn=addButton('copyClipBtn','⧉ Copiar','Ctrl/Cmd+C','#splitClipBtn');
  const pasteBtn=addButton('pasteClipBtn','📋 Pegar','Ctrl/Cmd+V','#copyClipBtn');
  const rippleBtn=addButton('rippleDeleteBtn','⇤ Borrar ripple','Shift+Delete','#deleteClipBtn');
  const gapBtn=addButton('closeGapsBtn','⇥ Cerrar huecos','G','#rippleDeleteBtn');
  function canSplit(c=clip()){const t=playhead();return !!c&&!locked(c)&&t>Number(c.start)+.05&&t<Number(c.start)+Number(c.duration)-.05}
  function update(){const c=clip();if(splitBtn)splitBtn.disabled=!canSplit(c);if(copyBtn)copyBtn.disabled=!c;if(pasteBtn)pasteBtn.disabled=!ops.clipboard;if(rippleBtn)rippleBtn.disabled=!c||locked(c);if(gapBtn)gapBtn.disabled=!c||locked(c)}
  function splitSelected(){const c=clip();if(!c){status('Selecciona un clip para dividir');return}if(locked(c)){status('La pista está bloqueada');return}const result=ops.split(project,c.id,playhead());if(!result){status('Coloca el cursor dentro del clip, lejos de sus bordes');return}root.ProfitMenteEditTools?.select(result.right.id);commit(`Clip dividido en ${playhead().toFixed(2)}s`);update()}
  function copySelected(){const c=clip();if(!c)return;ops.copy(c);status(`Clip copiado: ${c.name||'sin nombre'}`);update()}
  function paste(){if(!ops.clipboard)return;const target=clip(),track=target?.track??ops.clipboard.track;if(project.trackState?.[track]?.locked){status('La pista destino está bloqueada');return}const c=ops.paste(project,playhead(),track);root.ProfitMenteEditTools?.select(c.id);commit(`Clip pegado en ${c.start.toFixed(2)}s`);update()}
  function ripple(){const c=clip();if(!c||locked(c))return;const name=c.name||'clip';ops.rippleDelete(project,c.id);root.ProfitMenteEditTools?.select(null);commit(`Borrado ripple: ${name}`);update()}
  function gaps(){const c=clip();if(!c||locked(c))return;const n=ops.closeGaps(project,c.track);commit(n?`${n} hueco(s) cerrado(s) en la pista`:'La pista ya está compacta');update()}
  splitBtn?.addEventListener('click',splitSelected);copyBtn?.addEventListener('click',copySelected);pasteBtn?.addEventListener('click',paste);rippleBtn?.addEventListener('click',ripple);gapBtn?.addEventListener('click',gaps);
  $('#playhead')?.addEventListener('input',update);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='c'&&clip()){e.preventDefault();copySelected()}else if(mod&&e.key.toLowerCase()==='v'&&ops.clipboard){e.preventDefault();paste()}else if(!mod&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='s'&&clip()){e.preventDefault();splitSelected()}else if(e.shiftKey&&e.key==='Delete'&&clip()){e.preventDefault();ripple()}else if(!mod&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='g'&&clip()){e.preventDefault();gaps()}});
  update();root.ProfitMenteTimelineOps=ops;
})();