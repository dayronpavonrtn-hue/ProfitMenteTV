(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const FPS=30;
  function niceStep(duration,zoom=1){
    const d=Math.max(.001,Number(duration)||1),z=Math.max(1,Number(zoom)||1),target=Math.max(.25,d/(8*z));
    const steps=[.25,.5,1,2,5,10,15,30,60,120,300];
    return steps.find(x=>x>=target)||Math.ceil(target/300)*300;
  }
  function ticks(duration,zoom=1){
    const d=Math.max(.001,Number(duration)||1),step=niceStep(d,zoom),out=[];
    for(let t=0;t<d-.0001;t+=step)out.push(Number(t.toFixed(4)));
    if(!out.length||Math.abs(out[out.length-1]-d)>.001)out.push(d);
    return {step,ticks:out};
  }
  function label(seconds){
    const s=Math.max(0,Number(seconds)||0),m=Math.floor(s/60),sec=s-m*60;
    if(s<10&&Math.abs(sec-Math.round(sec))>.001)return `${sec.toFixed(1)}s`;
    return m?`${m}:${String(Math.floor(sec)).padStart(2,'0')}`:`${Math.floor(sec)}s`;
  }
  root.ProfitMenteTimelineRuler={niceStep,ticks,label};
  if(typeof document==='undefined')return;
  const $=s=>document.querySelector(s),timeline=$('.timeline');if(!timeline)return;
  const ruler=document.createElement('div');ruler.id='timelineRuler';ruler.className='timelineRuler';
  ruler.innerHTML='<span class="rulerLabel">Tiempo</span><div class="rulerScale" aria-label="Regla temporal"><div class="rulerPlayhead"></div></div>';
  const tracks=$('#tracks');timeline.insertBefore(ruler,tracks);
  const scale=ruler.querySelector('.rulerScale'),head=ruler.querySelector('.rulerPlayhead');
  function duration(){return Math.max(.001,Number(project?.duration)||1)}
  function zoom(){return Math.max(1,Number(localStorage.getItem('profitmente-timeline-zoom')||1))}
  function current(){return Math.max(0,Math.min(duration(),Number($('#playhead')?.value)||0))}
  function paint(){
    const d=duration(),z=zoom(),data=ticks(d,z);ruler.style.minWidth=`${z*100}%`;
    scale.querySelectorAll('.rulerTick').forEach(x=>x.remove());
    for(const t of data.ticks){const el=document.createElement('span');el.className='rulerTick';el.style.left=`${t/d*100}%`;el.innerHTML=`<i></i><b>${label(t)}</b>`;scale.appendChild(el)}
    head.style.left=`${current()/d*100}%`;
  }
  function seekFromEvent(e){
    const r=scale.getBoundingClientRect();if(!r.width)return;const t=Math.max(0,Math.min(duration(),(e.clientX-r.left)/r.width*duration()));
    if(root.ProfitMenteTransport?.seek)root.ProfitMenteTransport.seek(t);else{const p=$('#playhead');if(p){p.value=t;p.dispatchEvent(new Event('input',{bubbles:true}))}}
    paint();
  }
  scale.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();seekFromEvent(e);scale.setPointerCapture?.(e.pointerId);const move=x=>seekFromEvent(x),up=()=>{scale.removeEventListener('pointermove',move);scale.removeEventListener('pointerup',up);scale.removeEventListener('pointercancel',up)};scale.addEventListener('pointermove',move);scale.addEventListener('pointerup',up);scale.addEventListener('pointercancel',up)});
  $('#playhead')?.addEventListener('input',paint);
  const observer=new MutationObserver(()=>paint());observer.observe(tracks,{childList:true,subtree:false,attributes:true,attributeFilter:['style']});
  window.addEventListener('resize',paint);paint();
})();
