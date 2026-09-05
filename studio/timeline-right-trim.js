(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteTimelineRightTrimEngine=api.ProfitMenteTimelineRightTrimEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteTimelineRightTrimEngine{
  static round(v){const n=Number(v);return Number.isFinite(n)?Math.round(n*1000000)/1000000:0}
  static clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  static calculate(project={},clip={},candidateEnd=0,{playhead=null,tolerance=.15,minDuration=.25,sourceDuration=0,snapEngine=null}={}){
    const projectDuration=Math.max(.001,Number(project.duration)||1),start=this.clamp(clip.start,0,projectDuration),speed=Math.max(.01,Number(clip.speed)||1),sourceOffset=Math.max(0,Number(clip.sourceOffset)||0),requestedMin=Math.max(.001,Number(minDuration)||.25),minEnd=this.round(Math.min(projectDuration,start+requestedMin));
    let maxEnd=projectDuration;const source=Number(sourceDuration);
    if(Number.isFinite(source)&&source>0){const available=Math.max(0,source-sourceOffset)/speed;maxEnd=this.round(Math.min(projectDuration,start+available))}
    if(maxEnd<minEnd)maxEnd=minEnd;
    let next=this.round(this.clamp(candidateEnd,minEnd,maxEnd)),snapped=false,target=null;
    if(snapEngine?.points&&snapEngine?.nearest){const result=snapEngine.nearest(next,snapEngine.points(project,clip.id,playhead),tolerance);if(result.snapped&&result.value>=minEnd&&result.value<=maxEnd){next=this.round(result.value);snapped=true;target=result.target}}
    return {duration:this.round(Math.max(.001,next-start)),end:next,snapped,target,minEnd,maxEnd,sourceLimited:maxEnd<projectDuration};
  }
}
return {ProfitMenteTimelineRightTrimEngine};
});

if(typeof document!=='undefined')(()=>{
  if(typeof project==='undefined'||!window.ProfitMenteTimelineRightTrimEngine||window.ProfitMenteTimelineRightTrim)return;
  const Engine=window.ProfitMenteTimelineRightTrimEngine,Snap=window.ProfitMenteTimelineSnapEngine,sessions=new Map();
  function key(v){if(v===null||v===undefined||typeof v==='boolean')return null;const s=String(v).trim();if(!s)return null;if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){const n=Number(s);if(Number.isFinite(n))return `n:${n}`}return `s:${s}`}
  function same(a,b){const x=key(a),y=key(b);return x!==null&&x===y}
  function clipFor(el){return project.clips?.find(c=>same(c.id,el?.dataset?.id))||null}
  function assetFor(c){return typeof assets!=='undefined'&&Array.isArray(assets)?assets.find(x=>same(x.id,c.asset)):null}
  function sourceDuration(c){const a=assetFor(c);return a&&(a.type==='video'||a.type==='audio')?Math.max(0,Number(a.duration)||0):0}
  function tolerance(lane){const w=Math.max(1,lane?.clientWidth||1),seconds=(Math.max(1,Number(project.duration)||1)/w)*10;return Math.max(.035,Math.min(.35,seconds))}
  function playhead(){const v=Number(document.querySelector('#playhead')?.value);return Number.isFinite(v)?v:null}
  function down(e){if(e.button!==0)return;const el=e.target?.closest?.('.clip');if(!el)return;const rect=el.getBoundingClientRect();if(e.clientX<rect.right-10)return;const clip=clipFor(el);if(!clip)return;e.preventDefault();e.stopImmediatePropagation();const lane=el.parentElement,laneRect=lane?.getBoundingClientRect?.();if(!laneRect?.width)return;sessions.set(e.pointerId,{clip,el,lane,x:e.clientX,end:(Number(clip.start)||0)+Math.max(.001,Number(clip.duration)||.001),sourceDuration:sourceDuration(clip)});el.classList.add('dragging','trim-right');try{el.setPointerCapture(e.pointerId)}catch{}}
  function move(e){const s=sessions.get(e.pointerId);if(!s)return;e.preventDefault();const delta=(e.clientX-s.x)/Math.max(1,s.lane.clientWidth||1)*Math.max(.001,Number(project.duration)||1),candidate=s.end+delta,result=Engine.calculate(project,s.clip,candidate,{playhead:playhead(),tolerance:tolerance(s.lane),sourceDuration:s.sourceDuration,snapEngine:e.altKey?null:Snap});s.clip.duration=result.duration;s.el.style.width=`${Math.max(2,s.clip.duration/project.duration*100)}%`;s.el.classList.toggle('snapped',!!result.snapped);if(result.snapped)s.el.dataset.snapTarget=String(result.target);else delete s.el.dataset.snapTarget;}
  function end(e){const s=sessions.get(e.pointerId);if(!s)return;sessions.delete(e.pointerId);s.el.classList.remove('dragging','trim-right','snapped');delete s.el.dataset.snapTarget;if(typeof persist==='function')persist();if(typeof renderAt==='function')void renderAt(+(document.querySelector('#playhead')?.value||0));window.dispatchEvent(new CustomEvent('profitmente:clip-right-trimmed',{detail:{id:s.clip.id,duration:s.clip.duration,end:(Number(s.clip.start)||0)+s.clip.duration}}));}
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);window.ProfitMenteTimelineRightTrim={engine:Engine};
})();
