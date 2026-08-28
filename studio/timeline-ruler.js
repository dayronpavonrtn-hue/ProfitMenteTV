(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
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
  if(!document.querySelector('#profitmenteTimelineRulerStyle')){
    const style=document.createElement('style');style.id='profitmenteTimelineRulerStyle';style.textContent='.timelineRuler{display:grid;grid-template-columns:128px 1fr;align-items:end;height:30px;margin:0 0 4px;transition:min-width .12s ease}.rulerLabel{font-size:9px;color:#77808f;padding:0 0 6px}.rulerScale{height:26px;position:relative;border-bottom:1px solid #303746;cursor:ew-resize;user-select:none}.rulerTick{position:absolute;bottom:0;height:100%;transform:translateX(-.5px);pointer-events:none}.rulerTick i{position:absolute;bottom:0;width:1px;height:8px;background:#596477}.rulerTick b{position:absolute;bottom:9px;left:4px;font-size:8px;font-weight:400;color:#8f98a7;white-space:nowrap}.rulerPlayhead{position:absolute;top:0;bottom:-235px;width:1px;background:#fff;opacity:.75;z-index:8;pointer-events:none}.rulerPlayhead:before{content:"";position:absolute;top:-1px;left:-4px;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid #fff}';document.head.appendChild(style);
  }
  const $=s=>document.querySelector(s),timeline=$('.timeline');if(!timeline||$('#timelineRuler'))return;
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
  const observer=new MutationObserver(paint);observer.observe(tracks,{childList:true});
  window.addEventListener('resize',paint);paint();
})();
