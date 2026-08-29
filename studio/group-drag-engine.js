(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteGroupDragEngine{
    members(project,anchor){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const groupId=String(anchor?.groupId||'').trim();
      return groupId?clips.filter(c=>String(c.groupId||'').trim()===groupId):anchor?[anchor]:[];
    }
    snapshot(project,anchor){
      return this.members(project,anchor).map(c=>({id:c.id,start:Number(c.start)||0,duration:Math.max(0,Number(c.duration)||0),track:Number(c.track)||0}));
    }
    movePlan({duration,originals,anchorId,desiredStart,boundaries=[],snapSeconds=.15,desiredTrack=null,canTrack=null}){
      const list=Array.isArray(originals)?originals:[],anchor=list.find(x=>String(x.id)===String(anchorId));
      if(!anchor||!list.length)return null;
      const projectDuration=Math.max(0,Number(duration)||0),minStart=Math.min(...list.map(x=>x.start)),maxEnd=Math.max(...list.map(x=>x.start+x.duration));
      let delta=(Number(desiredStart)||0)-anchor.start;
      delta=Math.max(-minStart,Math.min(projectDuration-maxEnd,delta));
      let snap=null,best=Infinity;
      const points=[{time:minStart+delta,kind:'group-start'},{time:maxEnd+delta,kind:'group-end'}];
      for(const b0 of boundaries){const b=Number(b0);if(!Number.isFinite(b))continue;for(const p of points){const dist=Math.abs(b-p.time);if(dist<=snapSeconds&&dist<best){best=dist;snap={adjust:b-p.time,kind:p.kind,target:b}}}}
      if(snap){delta=Math.max(-minStart,Math.min(projectDuration-maxEnd,delta+snap.adjust));}
      let trackDelta=0,trackChanged=false;
      if(desiredTrack!==null&&desiredTrack!==undefined){
        trackDelta=Number(desiredTrack)-anchor.track;
        if(trackDelta){const valid=list.every(x=>{const next=x.track+trackDelta;return next>=0&&next<=6&&(!canTrack||canTrack(x,next));});if(!valid)trackDelta=0;else trackChanged=true;}
      }
      return {delta,trackDelta,trackChanged,snapped:!!snap,snapKind:snap?.kind||'',snapTarget:snap?.target??null,moves:list.map(x=>({id:x.id,start:x.start+delta,track:x.track+trackDelta}))};
    }
    apply(project,plan){
      if(!plan)return 0;const map=new Map((plan.moves||[]).map(x=>[String(x.id),x]));let changed=0;
      for(const clip of project?.clips||[]){const next=map.get(String(clip.id));if(!next)continue;if(Math.abs((Number(clip.start)||0)-next.start)>.0001||Number(clip.track)!==next.track)changed++;clip.start=next.start;clip.track=next.track;}
      return changed;
    }
  }
  root.ProfitMenteGroupDragEngine=ProfitMenteGroupDragEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteGroupDragEngine};
})();