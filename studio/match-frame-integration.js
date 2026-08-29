(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteMatchFrameEngine||window.ProfitMenteMatchFrame)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteMatchFrameEngine(),status=t=>typeof setStatus==='function'&&setStatus(t);
  const playhead=()=>Number($('#playhead')?.value)||0;
  const assetById=id=>assets?.find(a=>a?.id===id);
  const selectedId=()=>window.ProfitMenteEditTools?.selectedId||null;
  function seekMonitor(time){
    const monitor=window.ProfitMenteSourceMonitor,seek=monitor?.panel?.querySelector?.('.sourceMonitorSeek');
    if(!seek)return false;
    const apply=()=>{
      const max=Math.max(0,Number(seek.max)||0),target=Math.max(0,max>0?Math.min(Number(time)||0,max):Number(time)||0);
      seek.value=String(target);seek.dispatchEvent(new Event('input',{bubbles:true}));
      const media=monitor.panel.querySelector('.sourceMonitorMedia video,.sourceMonitorMedia audio');
      if(media){try{media.currentTime=target}catch{}}
    };
    apply();
    const media=monitor.panel.querySelector('.sourceMonitorMedia video,.sourceMonitorMedia audio');
    if(media&&media.readyState<1)media.addEventListener('loadedmetadata',apply,{once:true});
    return true;
  }
  function match(){
    const t=playhead(),clip=engine.chooseClip(project?.clips,t,selectedId());
    if(!clip){status('Match Frame: coloca el cursor sobre un clip de video o audio');return false}
    const asset=assetById(engine.sourceAssetId(clip)),r=engine.sourceTimeAt(clip,t,asset);
    if(!r.ok){status(r.reason==='av-required'?'Match Frame requiere una fuente de video o audio disponible':'El cursor debe estar dentro del clip');return false}
    if(!asset?.blob){status('Match Frame: la fuente original no está disponible localmente');return false}
    const monitor=window.ProfitMenteSourceMonitor;
    if(!monitor?.open){status('Match Frame: el Monitor de fuente todavía no está disponible');return false}
    monitor.open(asset);seekMonitor(r.time);
    status(`Match Frame · ${asset.name||'Fuente'} · ${r.time.toFixed(2)}s`);return true;
  }
  function mount(){
    if($('#matchFrameBtn'))return;
    const controls=document.querySelector('.transportControls')||document.querySelector('.timelineHead');if(!controls)return;
    const b=document.createElement('button');b.id='matchFrameBtn';b.type='button';b.textContent='◎';b.title='Match Frame: abrir en Monitor de fuente el fotograma bajo el cursor (F)';b.onclick=match;
    const next=document.querySelector('#nextCutBtn');if(next?.parentElement===controls)next.insertAdjacentElement('afterend',b);else controls.appendChild(b);
  }
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key.toLowerCase()==='f'){e.preventDefault();match()}
  });
  window.addEventListener('profitmente:features-ready',mount,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.ProfitMenteMatchFrame={engine,match,seekMonitor,mount};
})();
