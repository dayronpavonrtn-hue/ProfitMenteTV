(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteTimelineLeftTrimEngine=api.ProfitMenteTimelineLeftTrimEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteTimelineLeftTrimEngine{
  static round(v){const n=Number(v);return Number.isFinite(n)?Math.round(n*1000000)/1000000:0}
  static clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  static calculate(project={},clip={},candidateStart=0,{playhead=null,tolerance=.15,minDuration=.25,sourceBound=false,snapEngine=null}={}){
    const projectDuration=Math.max(.001,Number(project.duration)||1),start=this.clamp(clip.start,0,projectDuration),duration=Math.max(.001,Number(clip.duration)||.001),end=this.round(Math.min(projectDuration,start+duration)),speed=Math.max(.01,Number(clip.speed)||1),sourceOffset=Math.max(0,Number(clip.sourceOffset)||0),requestedMin=Math.max(.001,Number(minDuration)||.25),maxStart=this.round(Math.max(0,end-Math.min(requestedMin,end))),sourceMin=sourceBound?this.round(Math.max(0,start-sourceOffset/speed)):0,minStart=Math.min(sourceMin,maxStart);
    let next=this.round(this.clamp(candidateStart,minStart,maxStart)),snapped=false,target=null;
    if(snapEngine?.points&&snapEngine?.nearest){
      const result=snapEngine.nearest(next,snapEngine.points(project,clip.id,playhead),tolerance);
      if(result.snapped&&result.value>=minStart&&result.value<=maxStart){next=this.round(result.value);snapped=true;target=result.target}
    }
    const nextDuration=this.round(Math.max(.001,end-next)),delta=this.round(next-start),nextSourceOffset=sourceBound?this.round(Math.max(0,sourceOffset+delta*speed)):sourceOffset;
    return {start:next,duration:nextDuration,sourceOffset:nextSourceOffset,snapped,target,minStart,maxStart};
  }
}
return {ProfitMenteTimelineLeftTrimEngine};
});

if(typeof document!=='undefined')(()=>{
  if(typeof project==='undefined'||!window.ProfitMenteTimelineLeftTrimEngine||window.ProfitMenteTimelineLeftTrim)return;
  const Engine=window.ProfitMenteTimelineLeftTrimEngine,Snap=window.ProfitMenteTimelineSnapEngine,sessions=new Map();
  function key(v){if(v===null||v===undefined||typeof v==='boolean')return null;const s=String(v).trim();if(!s)return null;if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){const n=Number(s);if(Number.isFinite(n))return `n:${n}`}return `s:${s}`}
  function same(a,b){const x=key(a),y=key(b);return x!==null&&x===y}
  function clipFor(el){return project.clips?.find(c=>same(c.id,el?.dataset?.id))||null}
  function sourceBound(c){const a=typeof assets!=='undefined'&&Array.isArray(assets)?assets.find(x=>same(x.id,c.asset)):null;return a?.type==='video'||a?.type==='audio'||[4,5,6].includes(Number(c.track))}
  function tolerance(lane){const w=Math.max(1,lane?.clientWidth||1),seconds=(Math.max(1,Number(project.duration)||1)/w)*10;return Math.max(.035,Math.min(.35,seconds))}
  function playhead(){const v=Number(document.querySelector('#playhead')?.value);return Number.isFinite(v)?v:null}
  function down(e){
    if(e.button!==0)return;const el=e.target?.closest?.('.clip');if(!el)return;const rect=el.getBoundingClientRect();if(e.clientX>rect.left+10)return;
    const clip=clipFor(el);if(!clip)return;e.preventDefault();e.stopImmediatePropagation();
    const lane=el.parentElement,laneRect=lane?.getBoundingClientRect?.();if(!laneRect?.width)return;
    sessions.set(e.pointerId,{clip,el,lane,x:e.clientX,start:Number(clip.start)||0,duration:Math.max(.001,Number(clip.duration)||.001),sourceOffset:Math.max(0,Number(clip.sourceOffset)||0),sourceBound:sourceBound(clip)});
    el.classList.add('dragging','trim-left');try{el.setPointerCapture(e.pointerId)}catch{}
  }
  function move(e){
    const s=sessions.get(e.pointerId);if(!s)return;e.preventDefault();
    const delta=(e.clientX-s.x)/Math.max(1,s.lane.clientWidth||1)*Math.max(.001,Number(project.duration)||1),candidate=s.start+delta;
    const result=Engine.calculate(project,s.clip,candidate,{playhead:playhead(),tolerance:tolerance(s.lane),sourceBound:s.sourceBound,snapEngine:e.altKey?null:Snap});
    s.clip.start=result.start;s.clip.duration=result.duration;if(s.sourceBound)s.clip.sourceOffset=result.sourceOffset;
    s.el.style.left=`${s.clip.start/project.duration*100}%`;s.el.style.width=`${Math.max(2,s.clip.duration/project.duration*100)}%`;
    s.el.classList.toggle('snapped',!!result.snapped);if(result.snapped)s.el.dataset.snapTarget=String(result.target);else delete s.el.dataset.snapTarget;
  }
  function end(e){
    const s=sessions.get(e.pointerId);if(!s)return;sessions.delete(e.pointerId);s.el.classList.remove('dragging','trim-left','snapped');delete s.el.dataset.snapTarget;
    if(typeof persist==='function')persist();if(typeof renderAt==='function')void renderAt(+(document.querySelector('#playhead')?.value||0));
    window.dispatchEvent(new CustomEvent('profitmente:clip-left-trimmed',{detail:{id:s.clip.id,start:s.clip.start,duration:s.clip.duration,sourceOffset:s.clip.sourceOffset||0}}));
  }
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
  window.ProfitMenteTimelineLeftTrim={engine:Engine};
})();
