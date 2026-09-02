(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteTimelineOperations{
    constructor(){this.clipboard=null}
    trackLocked(project,track){
      const lockedIn=states=>{const state=states?.[track]??states?.[String(track)]??{};return !!(state&&typeof state==='object'&&state.locked)};
      return lockedIn(project?.trackState)||lockedIn(project?.trackStates);
    }
    isLocked(project,clip){return !!clip&&(!!clip.locked||this.trackLocked(project,clip.track))}
    anyLocked(project,clips){return (clips||[]).some(c=>this.isLocked(project,c))}
    cloneClip(clip,start=null){const c=structuredClone(clip);c.id=crypto.randomUUID();c.name=(clip.name||'Clip')+' copia';if(start!==null)c.start=start;return c}
    copy(clip){this.clipboard=structuredClone(clip);return this.clipboard}
    paste(project,at,track=null){
      if(!this.clipboard)return null;const targetTrack=track??this.clipboard.track;if(this.trackLocked(project,targetTrack))return null;
      const c=this.cloneClip(this.clipboard);c.track=targetTrack;c.start=Math.max(0,Math.min(Math.max(0,project.duration-c.duration),Number(at)||0));project.clips.push(c);return c
    }
    interpolateFrame(a,b,p){
      const out={};for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){const x=Number(a?.[key]),y=Number(b?.[key]);if(Number.isFinite(x)&&Number.isFinite(y))out[key]=x+(y-x)*p;else if(a?.[key]!==undefined)out[key]=structuredClone(a[key]);else out[key]=structuredClone(b[key])}return out;
    }
    trimWords(clip,start,end){
      if(!Array.isArray(clip.wordTimings))return;
      const words=[];for(const timing of clip.wordTimings){if(!timing||typeof timing!=='object')continue;const ws=Number(timing.start),we=Number(timing.end);if(!Number.isFinite(ws)||!Number.isFinite(we)||we<=ws||we<=start||ws>=end)continue;const item=structuredClone(timing);item.start=Math.max(start,ws);item.end=Math.min(end,we);item.duration=Math.max(0,item.end-item.start);if(item.duration>0)words.push(item)}
      clip.wordTimings=words.map((x,index)=>({...x,index}));if(Number(clip.track)===3){const text=clip.wordTimings.map(x=>String(x.word||'').trim()).filter(Boolean).join(' ');if(text)clip.name=text}
    }
    trimLeft(project,id,at,minDuration=.25){
      const c=project.clips.find(x=>x.id===id);if(!c||this.isLocked(project,c))return null;const start=Number(c.start)||0,duration=Number(c.duration)||0,end=start+duration,target=Math.max(start,Math.min(end-minDuration,Number(at)));
      if(!Number.isFinite(target)||target<=start+.001)return null;const original=structuredClone(c),p=duration>0?(target-start)/duration:0;c.start=target;c.duration=end-target;
      if(original.asset){const speed=Math.max(.25,Math.min(4,Number(original.speed)||1));c.sourceOffset=Math.max(0,(Number(original.sourceOffset)||0)+(target-start)*speed)}
      if(original.keyframes?.start&&original.keyframes?.end)c.keyframes={start:this.interpolateFrame(original.keyframes.start,original.keyframes.end,p),end:structuredClone(original.keyframes.end)};
      if(Object.prototype.hasOwnProperty.call(original,'fadeIn'))c.fadeIn=Math.min(c.duration,Math.max(0,Number(original.fadeIn)||0));if(Object.prototype.hasOwnProperty.call(original,'fadeOut'))c.fadeOut=Math.min(c.duration,Math.max(0,Number(original.fadeOut)||0));
      this.trimWords(c,target,end);return c;
    }
    trimRight(project,id,at,minDuration=.25){
      const c=project.clips.find(x=>x.id===id);if(!c||this.isLocked(project,c))return null;const start=Number(c.start)||0,duration=Number(c.duration)||0,end=start+duration,target=Math.min(end,Math.max(start+minDuration,Number(at)));
      if(!Number.isFinite(target)||target>=end-.001)return null;const original=structuredClone(c),p=duration>0?(target-start)/duration:1;c.duration=target-start;
      if(original.keyframes?.start&&original.keyframes?.end)c.keyframes={start:structuredClone(original.keyframes.start),end:this.interpolateFrame(original.keyframes.start,original.keyframes.end,p)};
      if(Object.prototype.hasOwnProperty.call(original,'fadeIn'))c.fadeIn=Math.min(c.duration,Math.max(0,Number(original.fadeIn)||0));if(Object.prototype.hasOwnProperty.call(original,'fadeOut'))c.fadeOut=Math.min(c.duration,Math.max(0,Number(original.fadeOut)||0));
      this.trimWords(c,start,target);return c;
    }
    split(project,id,at,minDuration=.05){
      const c=project.clips.find(x=>x.id===id);if(!c||this.isLocked(project,c))return null;
      const start=Number(c.start)||0,duration=Number(c.duration)||0,end=start+duration,cut=Number(at);
      if(!Number.isFinite(cut)||cut<=start+minDuration||cut>=end-minDuration)return null;
      const original=structuredClone(c),leftDuration=cut-start,rightDuration=end-cut,p=duration>0?leftDuration/duration:0;
      const right=structuredClone(original);right.id=crypto.randomUUID();right.start=cut;right.duration=rightDuration;right.name=original.name||'Clip';
      c.duration=leftDuration;
      if(original.asset){
        const speed=Math.max(.25,Math.min(4,Number(original.speed)||1));
        right.sourceOffset=Math.max(0,(Number(original.sourceOffset)||0)+leftDuration*speed);
      }
      if(Object.prototype.hasOwnProperty.call(original,'transition'))right.transition='cut';
      if(original.asset&&[0,1,4,5,6].includes(Number(original.track))){
        const originalFadeIn=original.fadeIn==null?.18:(Number.isFinite(Number(original.fadeIn))?Math.max(0,Number(original.fadeIn)):0);
        const originalFadeOut=original.fadeOut==null?.25:(Number.isFinite(Number(original.fadeOut))?Math.max(0,Number(original.fadeOut)):0);
        c.fadeIn=originalFadeIn;c.fadeOut=0;right.fadeIn=0;right.fadeOut=originalFadeOut;
      }
      const k=original.keyframes;
      if(k&&typeof k==='object'&&k.start&&k.end){
        const mid=this.interpolateFrame(k.start,k.end,p);
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
          const normalize=list=>list.map((x,index)=>({...x,index}));
          c.wordTimings=normalize(leftWords);right.wordTimings=normalize(rightWords);
          const text=list=>list.map(x=>String(x.word||'').trim()).filter(Boolean).join(' ');
          const leftText=text(c.wordTimings),rightText=text(right.wordTimings);if(leftText)c.name=leftText;if(rightText)right.name=rightText;
        }
      }
      project.clips.push(right);return {left:c,right};
    }
    rippleDelete(project,id){
      const c=project.clips.find(x=>x.id===id);if(!c)return null;const shift=Number(c.duration)||0,end=(Number(c.start)||0)+shift,track=c.track;
      const affected=project.clips.filter(x=>x.id===id||(x.track===track&&(Number(x.start)||0)>=end-.001));if(this.anyLocked(project,affected))return null;
      project.clips=project.clips.filter(x=>x.id!==id);for(const x of project.clips){if(x.track===track&&(Number(x.start)||0)>=end-.001)x.start=Math.max(Number(c.start)||0,(Number(x.start)||0)-shift)}return c
    }
    closeGaps(project,track){
      if(this.trackLocked(project,track))return 0;const clips=project.clips.filter(c=>c.track===track).sort((a,b)=>a.start-b.start);if(!clips.length)return 0;
      let cursor=0;const moves=[];for(const c of clips){const start=Number(c.start)||0,duration=Number(c.duration)||0;if(start>cursor+.001){if(this.isLocked(project,c))return 0;moves.push([c,cursor]);cursor=Math.max(cursor,cursor+duration)}else cursor=Math.max(cursor,start+duration)}
      for(const [c,start] of moves)c.start=start;return moves.length
    }
    insertGap(project,track,at,gap=1){
      const t=Math.max(0,Number(at)||0),amount=Math.max(.05,Number(gap)||1),clips=(project.clips||[]).filter(c=>c.track===track),affected=clips.filter(c=>(Number(c.start)||0)>=t-.001);
      if(this.trackLocked(project,track))return {ok:false,reason:'locked',track,moved:0,gap:amount};
      const locked=affected.find(c=>this.isLocked(project,c));if(locked)return {ok:false,reason:'locked',track,clip:locked,moved:0,gap:amount};
      const crossing=clips.find(c=>(Number(c.start)||0)<t-.001&&(Number(c.start)||0)+(Number(c.duration)||0)>t+.001);
      if(crossing)return {ok:false,reason:'crossing',clip:crossing,moved:0,gap:amount};
      let moved=0,maxEnd=0;
      for(const c of clips){if((Number(c.start)||0)>=t-.001){c.start=(Number(c.start)||0)+amount;moved++}maxEnd=Math.max(maxEnd,(Number(c.start)||0)+(Number(c.duration)||0))}
      if(!moved)return {ok:false,reason:'empty',moved:0,gap:amount};
      project.duration=Math.max(Number(project.duration)||0,maxEnd);
      return {ok:true,moved,gap:amount,track,at:t,duration:project.duration};
    }
    insertTime(project,at,gap=1){
      const t=Math.max(0,Number(at)||0),amount=Math.max(.05,Number(gap)||1),clips=project.clips||[];
      const affected=clips.filter(c=>(Number(c.start)||0)>=t-.001);
      if(!affected.length)return {ok:false,reason:'empty',moved:0,gap:amount};
      const locked=affected.find(c=>this.isLocked(project,c));
      if(locked)return {ok:false,reason:'locked',track:locked.track,clip:locked,moved:0,gap:amount};
      const crossing=clips.find(c=>(Number(c.start)||0)<t-.001&&(Number(c.start)||0)+(Number(c.duration)||0)>t+.001);
      if(crossing)return {ok:false,reason:'crossing',track:crossing.track,clip:crossing,moved:0,gap:amount};
      for(const c of affected)c.start=(Number(c.start)||0)+amount;
      const oldDuration=Math.max(0,Number(project.duration)||0),maxEnd=clips.reduce((m,c)=>Math.max(m,(Number(c.start)||0)+(Number(c.duration)||0)),0);
      project.duration=Math.max(oldDuration+amount,maxEnd);
      return {ok:true,moved:affected.length,gap:amount,at:t,duration:project.duration,tracks:[...new Set(affected.map(c=>c.track))]};
    }
  }
  root.ProfitMenteTimelineOperations=ProfitMenteTimelineOperations;
  if(typeof document==='undefined')return;
  const ops=new ProfitMenteTimelineOperations(),$=s=>document.querySelector(s);
  const selected=()=>root.ProfitMenteEditTools?.selectedId;
  const clip=()=>project.clips.find(c=>c.id===selected());
  const locked=c=>ops.isLocked(project,c);
  const playhead=()=>+$('#playhead')?.value||0;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function commit(t){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();if(typeof renderAt==='function')renderAt(playhead());status(t)}
  function addButton(id,text,title,after){if($('#'+id))return;const b=document.createElement('button');b.id=id;b.textContent=text;b.title=title;const ref=$(after);ref?.parentNode?.insertBefore(b,ref.nextSibling);return b}
  const splitBtn=addButton('splitClipBtn','✂ Dividir','Dividir clip en el cursor (S)','#duplicateBtn');
  const copyBtn=addButton('copyClipBtn','⧉ Copiar','Ctrl/Cmd+C','#splitClipBtn');
  const pasteBtn=addButton('pasteClipBtn','📋 Pegar','Ctrl/Cmd+V','#copyClipBtn');
  const rippleBtn=addButton('rippleDeleteBtn','⇤ Borrar ripple','Shift+Delete','#deleteClipBtn');
  const gapBtn=addButton('closeGapsBtn','⇥ Cerrar huecos','G','#rippleDeleteBtn');
  const insertGapBtn=addButton('insertGapBtn','＋ 1s','Abrir 1 segundo en la pista desde el cursor (Shift+G)','#closeGapsBtn');
  const insertTimeBtn=addButton('insertTimeBtn','＋ Tiempo','Abrir 1 segundo sincronizado en todas las pistas (Ctrl/Cmd+Shift+G)','#insertGapBtn');
  function canSplit(c=clip()){const t=playhead();return !!c&&!locked(c)&&t>Number(c.start)+.05&&t<Number(c.start)+Number(c.duration)-.05}
  function update(){const c=clip();if(splitBtn)splitBtn.disabled=!canSplit(c);if(copyBtn)copyBtn.disabled=!c;if(pasteBtn)pasteBtn.disabled=!ops.clipboard;if(rippleBtn)rippleBtn.disabled=!c||locked(c);if(gapBtn)gapBtn.disabled=!c||locked(c);if(insertGapBtn)insertGapBtn.disabled=!c||locked(c);if(insertTimeBtn)insertTimeBtn.disabled=!(project.clips||[]).some(x=>(Number(x.start)||0)>=playhead()-.001)}
  function splitSelected(){const c=clip();if(!c){status('Selecciona un clip para dividir');return}if(locked(c)){status('El clip o la pista está bloqueado');return}const result=ops.split(project,c.id,playhead());if(!result){status('Coloca el cursor dentro del clip, lejos de sus bordes');return}root.ProfitMenteEditTools?.select(result.right.id);commit(`Clip dividido en ${playhead().toFixed(2)}s`);update()}
  function copySelected(){const c=clip();if(!c)return;ops.copy(c);status(`Clip copiado: ${c.name||'sin nombre'}`);update()}
  function paste(){if(!ops.clipboard)return;const target=clip(),track=target?.track??ops.clipboard.track;if(ops.trackLocked(project,track)){status('La pista destino está bloqueada');return}const c=ops.paste(project,playhead(),track);if(!c){status('No se pudo pegar el clip');return}root.ProfitMenteEditTools?.select(c.id);commit(`Clip pegado en ${c.start.toFixed(2)}s`);update()}
  function ripple(){const c=clip();if(!c||locked(c))return;const name=c.name||'clip';const removed=ops.rippleDelete(project,c.id);if(!removed){status('Borrado ripple bloqueado: afectaría un clip protegido');return}root.ProfitMenteEditTools?.select(null);commit(`Borrado ripple: ${name}`);update()}
  function gaps(){const c=clip();if(!c||locked(c))return;const n=ops.closeGaps(project,c.track);commit(n?`${n} hueco(s) cerrado(s) en la pista`:'No se cerraron huecos; revisa clips bloqueados');update()}
  function insertGap(){const c=clip();if(!c){status('Selecciona un clip de la pista donde quieres abrir espacio');return}const r=ops.insertGap(project,c.track,playhead(),1);if(!r.ok){if(r.reason==='locked')status('La pista o un clip afectado está bloqueado');else if(r.reason==='crossing')status('No se puede abrir espacio: hay un clip cruzando el cursor');else status('No hay clips después del cursor en esa pista');return}commit(`Espacio de 1.00s insertado · ${r.moved} clip(s) desplazados`);update()}
  function insertTime(){const r=ops.insertTime(project,playhead(),1);if(!r.ok){if(r.reason==='locked')status(`No se puede insertar tiempo: la pista ${Number(r.track)+1} contiene contenido bloqueado`);else if(r.reason==='crossing')status(`No se puede insertar tiempo: un clip de la pista ${Number(r.track)+1} cruza el cursor`);else status('No hay clips después del cursor');return}commit(`Tiempo global +1.00s · ${r.moved} clip(s) en ${r.tracks.length} pista(s)`);update()}
  splitBtn?.addEventListener('click',splitSelected);copyBtn?.addEventListener('click',copySelected);pasteBtn?.addEventListener('click',paste);rippleBtn?.addEventListener('click',ripple);gapBtn?.addEventListener('click',gaps);insertGapBtn?.addEventListener('click',insertGap);insertTimeBtn?.addEventListener('click',insertTime);
  $('#playhead')?.addEventListener('input',update);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.shiftKey&&e.key.toLowerCase()==='g'){e.preventDefault();insertTime()}else if(mod&&e.key.toLowerCase()==='c'&&clip()){e.preventDefault();copySelected()}else if(mod&&e.key.toLowerCase()==='v'&&ops.clipboard){e.preventDefault();paste()}else if(!mod&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='s'&&clip()){e.preventDefault();splitSelected()}else if(e.shiftKey&&e.key==='Delete'&&clip()){e.preventDefault();ripple()}else if(!mod&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='g'&&clip()){e.preventDefault();gaps()}else if(!mod&&!e.altKey&&e.shiftKey&&e.key.toLowerCase()==='g'&&clip()){e.preventDefault();insertGap()}});
  update();root.ProfitMenteTimelineOps=ops;
})();