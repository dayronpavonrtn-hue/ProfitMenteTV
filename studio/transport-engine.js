(()=>{
  const $=s=>document.querySelector(s);
  const finite=(value,fallback=0)=>{
    if(value===null||value===undefined||typeof value==='boolean')return fallback;
    const n=Number(value);
    return Number.isFinite(n)?n:fallback;
  };
  function fps(){
    const value=Math.round(finite(project?.fps,30));
    return [24,30,60].includes(value)?value:30;
  }
  function readZoom(){try{return finite(localStorage.getItem('profitmente-timeline-zoom'),1)}catch{return 1}}
  function normalizeZoom(value,fallback=1){return Math.max(1,Math.min(6,finite(value,fallback)))}
  let zoom=normalizeZoom(readZoom());

  function isTyping(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||!!document.activeElement?.isContentEditable}
  function current(){return Math.max(0,finite($('#playhead')?.value,0))}
  function duration(){const value=finite(project?.duration,1);return value>0?value:1}
  function seek(t){
    const p=$('#playhead'); if(!p)return;
    if(typeof playing!=='undefined'&&playing){playing=false;audio?.stop?.();cancelAnimationFrame(playTimer);const b=$('#playBtn');if(b)b.textContent='▶ Preview'}
    t=Math.max(0,Math.min(duration(),finite(t,current())));p.value=t;syncForm();renderAt(t);
  }
  function boundaries(){
    const limit=duration(),out=new Set([0,limit]);
    for(const c of project?.clips||[]){
      const start=finite(c?.start,NaN),length=finite(c?.duration,NaN);
      if(!Number.isFinite(start)||!Number.isFinite(length)||length<=0)continue;
      out.add(Math.max(0,Math.min(limit,start)));
      out.add(Math.max(0,Math.min(limit,start+length)));
    }
    return [...out].filter(Number.isFinite).sort((a,b)=>a-b);
  }
  function prevCut(){const t=current(),eps=1/fps()/2,b=boundaries().filter(x=>x<t-eps);seek(b.length?b[b.length-1]:0)}
  function nextCut(){const t=current(),eps=1/fps()/2,b=boundaries().find(x=>x>t+eps);seek(b??duration())}
  function notifyZoom(){window.dispatchEvent(new CustomEvent('profitmente:timelinezoom',{detail:{zoom}}))}
  function applyZoom(){
    zoom=normalizeZoom(zoom,1);
    try{localStorage.setItem('profitmente-timeline-zoom',String(zoom))}catch{}
    document.querySelectorAll('.track').forEach(el=>el.style.minWidth=`${zoom*100}%`);
    const z=$('#timelineZoom');if(z)z.value=zoom;
    const l=$('#zoomLabel');if(l)l.textContent=`${zoom.toFixed(1)}×`;
    notifyZoom();
  }
  const originalDraw=drawTimeline;
  drawTimeline=function(){originalDraw();applyZoom()};

  const head=document.querySelector('.timelineHead');
  if(head){
    const controls=document.createElement('div');controls.className='transportControls';
    controls.innerHTML=`<button id="prevCutBtn" title="Corte anterior (Shift+←)">⏮</button><button id="prevFrameBtn" title="Fotograma anterior (←)">◀</button><button id="nextFrameBtn" title="Fotograma siguiente (→)">▶</button><button id="nextCutBtn" title="Corte siguiente (Shift+→)">⏭</button><span class="zoomText">Zoom</span><input id="timelineZoom" type="range" min="1" max="6" step="0.5" value="${zoom}"><span id="zoomLabel">${zoom.toFixed(1)}×</span>`;
    head.insertBefore(controls,head.lastElementChild);
    $('#prevFrameBtn').onclick=()=>seek(current()-1/fps());
    $('#nextFrameBtn').onclick=()=>seek(current()+1/fps());
    $('#prevCutBtn').onclick=prevCut;$('#nextCutBtn').onclick=nextCut;
    $('#timelineZoom').oninput=e=>{zoom=normalizeZoom(e.target.value,zoom);applyZoom()};
  }
  document.addEventListener('keydown',e=>{
    if(isTyping())return;
    if(e.code==='Space'){e.preventDefault();$('#playBtn')?.click();return}
    if(e.key==='ArrowLeft'){e.preventDefault();e.shiftKey?prevCut():seek(current()-1/fps())}
    if(e.key==='ArrowRight'){e.preventDefault();e.shiftKey?nextCut():seek(current()+1/fps())}
    if((e.ctrlKey||e.metaKey)&&['+','='].includes(e.key)){e.preventDefault();zoom+=.5;applyZoom()}
    if((e.ctrlKey||e.metaKey)&&e.key==='-'){e.preventDefault();zoom-=.5;applyZoom()}
  });
  applyZoom();
  window.ProfitMenteTransport={seek,prevCut,nextCut,get fps(){return fps()},get zoom(){return zoom},setZoom(v){zoom=normalizeZoom(v,zoom);applyZoom()},boundaries};
  function loadOnce(src,key,globalName){if(globalName&&window[globalName])return;if(document.querySelector(`script[data-profitmente-${key}]`))return;const s=document.createElement('script');s.src=src;s.dataset[`profitmente${key[0].toUpperCase()+key.slice(1)}`]='1';document.body.appendChild(s)}
  loadOnce('timeline-ruler.js','timelineRuler','ProfitMenteTimelineRuler');
  loadOnce('project-duration.js','projectDuration','ProfitMenteProjectDuration');
  loadOnce('timeline-focus-engine.js','timelineFocus','ProfitMenteTimelineFocusEngine');
})();