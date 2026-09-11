(()=>{
  const root=typeof window!=='undefined'?window:globalThis;

  function strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text)return null;
    const n=Number(text);return Number.isFinite(n)?n:null;
  }
  function shiftWordTimings(clip,delta){
    if(!Array.isArray(clip?.wordTimings)||!delta)return 0;
    let shifted=0;
    for(const word of clip.wordTimings){
      if(!word||typeof word!=='object')continue;
      const start=strictNumber(word.start),end=strictNumber(word.end);
      let changed=false;
      if(start!==null){word.start=Math.max(0,start+delta);changed=true}
      if(end!==null){word.end=Math.max(0,end+delta);changed=true}
      if(changed)shifted++;
    }
    return shifted;
  }
  function shiftProjectPoint(value,at,delta){
    const n=strictNumber(value);if(n===null)return value;
    return n>=at-.001?n+delta:n;
  }
  function installInsertTimeSync(){
    const Ops=root.ProfitMenteTimelineOperations;
    if(!Ops?.prototype||Ops.prototype.__profitmenteInsertTimeSync)return;
    const baseInsertTime=Ops.prototype.insertTime,baseInsertGap=Ops.prototype.insertGap;
    if(typeof baseInsertTime!=='function'||typeof baseInsertGap!=='function')return;
    Object.defineProperty(Ops.prototype,'__profitmenteInsertTimeSync',{value:true,configurable:false});

    Ops.prototype.insertGap=function(project,track,at,gap=1){
      const t=strictNumber(at),amount=strictNumber(gap);
      if(t===null||t<0||amount===null||amount<.05)return {ok:false,reason:'invalid',moved:0,gap:amount};
      const affected=(Array.isArray(project?.clips)?project.clips:[]).filter(c=>c?.track===track&&strictNumber(c?.start)!==null&&strictNumber(c.start)>=t-.001);
      const result=baseInsertGap.call(this,project,track,t,amount);
      if(!result?.ok)return result;
      let wordsShifted=0;for(const clip of affected)wordsShifted+=shiftWordTimings(clip,result.gap);
      return {...result,wordsShifted};
    };

    Ops.prototype.insertTime=function(project,at,gap=1){
      const t=strictNumber(at),amount=strictNumber(gap);
      if(t===null||t<0||amount===null||amount<.05)return {ok:false,reason:'invalid',moved:0,gap:amount};
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const affected=clips.filter(c=>strictNumber(c?.start)!==null&&strictNumber(c.start)>=t-.001);
      const result=baseInsertTime.call(this,project,t,amount);
      if(!result?.ok)return result;
      let wordsShifted=0;for(const clip of affected)wordsShifted+=shiftWordTimings(clip,result.gap);
      let markersShifted=0;
      if(Array.isArray(project?.markers))for(const marker of project.markers){
        if(!marker||typeof marker!=='object')continue;
        const before=strictNumber(marker.time);if(before===null||before<t-.001)continue;
        marker.time=before+result.gap;markersShifted++;
      }
      if(project?.workRange&&typeof project.workRange==='object'){
        project.workRange={...project.workRange,
          start:shiftProjectPoint(project.workRange.start,t,result.gap),
          end:shiftProjectPoint(project.workRange.end,t,result.gap)
        };
      }
      return {...result,wordsShifted,markersShifted};
    };
  }
  installInsertTimeSync();

  function installRippleWordSync(){
    const Ops=root.ProfitMenteTimelineOperations;
    if(!Ops?.prototype||Ops.prototype.__profitmenteRippleWordSync)return;
    const baseRippleDelete=Ops.prototype.rippleDelete,baseCloseGaps=Ops.prototype.closeGaps;
    if(typeof baseRippleDelete!=='function'||typeof baseCloseGaps!=='function')return;
    Object.defineProperty(Ops.prototype,'__profitmenteRippleWordSync',{value:true,configurable:false});
    const snapshot=project=>new Map((Array.isArray(project?.clips)?project.clips:[]).map(c=>[c,{start:strictNumber(c?.start)}]));
    const sync=(project,before)=>{
      let clipsShifted=0,wordsShifted=0;
      for(const clip of Array.isArray(project?.clips)?project.clips:[]){
        const previous=before.get(clip)?.start,current=strictNumber(clip?.start);
        if(previous===null||previous===undefined||current===null)continue;
        const delta=current-previous;if(Math.abs(delta)<.000001)continue;
        clipsShifted++;wordsShifted+=shiftWordTimings(clip,delta);
      }
      return {clipsShifted,wordsShifted};
    };
    Ops.prototype.rippleDelete=function(project,id){
      const before=snapshot(project),result=baseRippleDelete.call(this,project,id);
      if(!result)return result;
      const counts=sync(project,before);if(result&&typeof result==='object')Object.assign(result,{rippleWordsShifted:counts.wordsShifted});
      return result;
    };
    Ops.prototype.closeGaps=function(project,track){
      const before=snapshot(project),result=baseCloseGaps.call(this,project,track);
      if(!result)return result;
      sync(project,before);return result;
    };
  }
  installRippleWordSync();

  function loadRippleTrim(){
    if(typeof document==='undefined'||root.ProfitMenteRippleTrim)return;
    const load=(src,ready)=>new Promise((resolve,reject)=>{
      if(ready()){resolve();return}
      const existing=document.querySelector(`script[src="${src}"]`);
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
      const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
    });
    load('ripple-trim-engine.js',()=>!!root.ProfitMenteRippleTrimEngine)
      .then(()=>load('ripple-trim-integration.js',()=>!!root.ProfitMenteRippleTrim))
      .catch(error=>console.warn('Ripple trim no disponible',error));
  }
  loadRippleTrim();

  if(typeof document==='undefined'||!root.ProfitMenteRemoveTimeEngine)return;
  const $=s=>document.querySelector(s),engine=new root.ProfitMenteRemoveTimeEngine();
  const playhead=()=>+$('#playhead')?.value||0;
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function commit(t){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();if(typeof renderAt==='function')renderAt(playhead());status(t)}
  function addButton(){if($('#removeTimeBtn'))return $('#removeTimeBtn');const b=document.createElement('button');b.id='removeTimeBtn';b.textContent='− Tiempo';b.title='Eliminar 1 segundo vacío y cerrar todas las pistas (Ctrl/Cmd+Shift+Backspace)';const ref=$('#insertTimeBtn')||$('#insertGapBtn');ref?.parentNode?.insertBefore(b,ref.nextSibling);return b}
  const btn=addButton();
  function canRemove(){const p=root.project||project,t=playhead(),duration=Math.max(0,Number(p?.duration)||0);if(t+1>duration+.001)return false;return !(p.clips||[]).some(c=>{const s=Number(c.start)||0,e=s+Math.max(0,Number(c.duration)||0);return s<t+1-.001&&e>t+.001})}
  function update(){if(btn)btn.disabled=!canRemove()}
  function removeTime(){const p=root.project||project,r=engine.remove(p,playhead(),1);if(!r.ok){if(r.reason==='occupied')status(`No se puede quitar tiempo: hay contenido en la pista ${Number(r.track)+1} dentro del segundo seleccionado`);else if(r.reason==='locked')status(`No se puede quitar tiempo: la pista ${Number(r.track)+1} está bloqueada`);else status('No hay 1 segundo completo disponible desde el cursor');update();return}commit(`Tiempo global −1.00s · ${r.moved} clip(s) desplazados`);update()}
  btn?.addEventListener('click',removeTime);
  $('#playhead')?.addEventListener('input',update);
  document.addEventListener('click',()=>requestAnimationFrame(update),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.shiftKey&&e.key==='Backspace'){e.preventDefault();removeTime()}});
  update();root.ProfitMenteRemoveTime=engine;
})();