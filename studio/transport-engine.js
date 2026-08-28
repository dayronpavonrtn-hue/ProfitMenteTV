(()=>{
  const $=s=>document.querySelector(s);
  const FPS=30;
  let zoom=Number(localStorage.getItem('profitmente-timeline-zoom')||1);
  zoom=Math.max(1,Math.min(6,zoom));

  function isTyping(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
  function current(){return Number($('#playhead')?.value||0)}
  function duration(){return Math.max(.001,Number(project?.duration||1))}
  function seek(t){
    const p=$('#playhead'); if(!p)return;
    if(typeof playing!=='undefined'&&playing){playing=false;audio?.stop?.();cancelAnimationFrame(playTimer);const b=$('#playBtn');if(b)b.textContent='▶ Preview'}
    t=Math.max(0,Math.min(duration(),t));p.value=t;syncForm();renderAt(t);
  }
  function boundaries(){
    const out=new Set([0,duration()]);
    for(const c of project?.clips||[]){out.add(Math.max(0,Number(c.start)||0));out.add(Math.min(duration(),(Number(c.start)||0)+(Number(c.duration)||0)))}
    return [...out].sort((a,b)=>a-b);
  }
  function prevCut(){const t=current(),eps=1/FPS/2,b=boundaries().filter(x=>x<t-eps);seek(b.length?b[b.length-1]:0)}
  function nextCut(){const t=current(),eps=1/FPS/2,b=boundaries().find(x=>x>t+eps);seek(b??duration())}
  function notifyZoom(){window.dispatchEvent(new CustomEvent('profitmente:timelinezoom',{detail:{zoom}}))}
  function applyZoom(){
    zoom=Math.max(1,Math.min(6,zoom));
    localStorage.setItem('profitmente-timeline-zoom',String(zoom));
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
    $('#prevFrameBtn').onclick=()=>seek(current()-1/FPS);
    $('#nextFrameBtn').onclick=()=>seek(current()+1/FPS);
    $('#prevCutBtn').onclick=prevCut;$('#nextCutBtn').onclick=nextCut;
    $('#timelineZoom').oninput=e=>{zoom=Number(e.target.value);applyZoom()};
  }
  document.addEventListener('keydown',e=>{
    if(isTyping())return;
    if(e.code==='Space'){e.preventDefault();$('#playBtn')?.click();return}
    if(e.key==='ArrowLeft'){e.preventDefault();e.shiftKey?prevCut():seek(current()-1/FPS)}
    if(e.key==='ArrowRight'){e.preventDefault();e.shiftKey?nextCut():seek(current()+1/FPS)}
    if((e.ctrlKey||e.metaKey)&&['+','='].includes(e.key)){e.preventDefault();zoom+=.5;applyZoom()}
    if((e.ctrlKey||e.metaKey)&&e.key==='-'){e.preventDefault();zoom-=.5;applyZoom()}
  });
  applyZoom();
  window.ProfitMenteTransport={seek,prevCut,nextCut,get zoom(){return zoom},setZoom(v){zoom=Number(v);applyZoom()}};
  if(!window.ProfitMenteTimelineRuler&&!document.querySelector('script[data-profitmente-timeline-ruler]')){
    const s=document.createElement('script');s.src='timeline-ruler.js';s.dataset.profitmenteTimelineRuler='1';document.body.appendChild(s);
  }
})();
