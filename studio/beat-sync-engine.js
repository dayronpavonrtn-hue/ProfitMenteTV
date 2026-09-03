class ProfitMenteBeatSyncEngine{
  trackLocked(project,track){
    const read=map=>map?.[track]??map?.[String(track)]??{};
    const current=read(project?.trackState),legacy=read(project?.trackStates);
    return !!(current&&typeof current==='object'&&current.locked)||!!(legacy&&typeof legacy==='object'&&legacy.locked);
  }
  clipLocked(clip){return clip?.locked===true}
  beatTimes(markers,duration=Infinity){
    return (Array.isArray(markers)?markers:[])
      .filter(m=>/^Beat\b/i.test(String(m?.label||'')))
      .map(m=>Number(m.time))
      .filter(t=>Number.isFinite(t)&&t>0&&t<Number(duration))
      .sort((a,b)=>a-b)
      .filter((t,i,a)=>i===0||Math.abs(t-a[i-1])>.02);
  }
  generatedScenes(project){
    return (project?.clips||[])
      .filter(c=>Number(c.track)===0&&String(c.sceneText||'').trim())
      .sort((a,b)=>Number(a.start)-Number(b.start));
  }
  linkedCaptions(project,scene){
    return (project?.clips||[]).filter(c=>Number(c.track)===3&&(c.sceneId&&scene.sceneId?c.sceneId===scene.sceneId:String(c.name||'')===String(scene.sceneText||'')));
  }
  linkedBroll(project,scene){
    return (project?.clips||[]).filter(c=>Number(c.track)===1&&(c.sceneId&&scene.sceneId?c.sceneId===scene.sceneId:String(c.name||'')===`B-roll · ${scene.name}`));
  }
  protectedEdits(project,scenes=this.generatedScenes(project)){
    const protectedItems=[];
    if(this.trackLocked(project,0)&&scenes.length)protectedItems.push({kind:'track',track:0,count:scenes.length});
    for(const scene of scenes)if(this.clipLocked(scene))protectedItems.push({kind:'clip',track:0,id:scene.id||null});
    for(const scene of scenes){
      const captions=this.linkedCaptions(project,scene),broll=this.linkedBroll(project,scene);
      if(this.trackLocked(project,3)&&captions.length)protectedItems.push({kind:'track',track:3,count:captions.length});
      else for(const clip of captions)if(this.clipLocked(clip))protectedItems.push({kind:'clip',track:3,id:clip.id||null});
      if(this.trackLocked(project,1)&&broll.length)protectedItems.push({kind:'track',track:1,count:broll.length});
      else for(const clip of broll)if(this.clipLocked(clip))protectedItems.push({kind:'clip',track:1,id:clip.id||null});
    }
    return protectedItems;
  }
  nearestBeat(beats,target,min,max,maxShift){
    let best=null,dist=Infinity;
    for(const beat of beats){
      if(beat<min||beat>max)continue;
      const d=Math.abs(beat-target);
      if(d<=maxShift&&d<dist){best=beat;dist=d;}
    }
    return best;
  }
  retimeWordTimings(words,oldStart,oldDuration,newStart,newDuration){
    if(!Array.isArray(words)||!words.length)return words;
    const safeOld=Math.max(.001,Number(oldDuration)||.001),safeNew=Math.max(.001,Number(newDuration)||.001);
    return words.map((w,i)=>{
      const ws=Number(w.start),we=Number(w.end),wd=Number(w.duration);
      const relStart=Math.max(0,Math.min(1,((Number.isFinite(ws)?ws:oldStart)-oldStart)/safeOld));
      const rawEnd=Number.isFinite(we)?we:(Number.isFinite(ws)&&Number.isFinite(wd)?ws+wd:oldStart);
      const relEnd=Math.max(relStart,Math.min(1,(rawEnd-oldStart)/safeOld));
      const start=newStart+relStart*safeNew,end=newStart+relEnd*safeNew;
      return {...w,index:Number.isFinite(Number(w.index))?Number(w.index):i,start,duration:Math.max(.001,end-start),end};
    });
  }
  sync(project,opts={}){
    const duration=Math.max(0,Number(project?.duration)||0),scenes=this.generatedScenes(project),beats=this.beatTimes(project?.markers,duration);
    if(scenes.length<2)return {changed:0,boundaries:0,reason:'not-enough-scenes'};
    if(!beats.length)return {changed:0,boundaries:0,reason:'no-beats'};
    const protectedItems=this.protectedEdits(project,scenes);
    if(protectedItems.length)return {changed:0,boundaries:0,reason:'locked-edit',locked:protectedItems.length,protectedItems};
    const minScene=Math.max(.5,Number(opts.minScene)||1.25),maxShift=Math.max(.05,Number(opts.maxShift)||1.25);
    const original=scenes.map(c=>({clip:c,start:Number(c.start)||0,duration:Math.max(.001,Number(c.duration)||.001),end:(Number(c.start)||0)+Math.max(.001,Number(c.duration)||.001)}));
    const projectEnd=duration||original[original.length-1].end;
    const boundaries=[Math.max(0,original[0].start)];let snapped=0;
    for(let i=1;i<original.length;i++){
      const nominal=original[i].start,remaining=original.length-i;
      const min=boundaries[i-1]+minScene,max=projectEnd-remaining*minScene;
      const beat=max>=min?this.nearestBeat(beats,nominal,min,max,maxShift):null;
      boundaries.push(beat??Math.max(min,Math.min(max,nominal)));
      if(beat!=null&&Math.abs(beat-nominal)>.001)snapped++;
    }
    boundaries.push(projectEnd);
    let changed=0;
    for(let i=0;i<original.length;i++){
      const old=original[i],scene=old.clip,newStart=boundaries[i],newEnd=boundaries[i+1],newDuration=Math.max(.001,newEnd-newStart);
      if(Math.abs(scene.start-newStart)>.001||Math.abs(scene.duration-newDuration)>.001)changed++;
      scene.start=+newStart.toFixed(3);scene.duration=+newDuration.toFixed(3);
      const captions=this.linkedCaptions(project,scene);
      for(const cap of captions){
        const oldCapStart=Number(cap.start)||old.start,oldCapDuration=Math.max(.001,Number(cap.duration)||old.duration),pad=Math.min(.15,newDuration*.08),capStart=newStart+pad,capDuration=Math.max(.2,newDuration-pad*2);
        cap.wordTimings=this.retimeWordTimings(cap.wordTimings,oldCapStart,oldCapDuration,capStart,capDuration);
        cap.start=+capStart.toFixed(3);cap.duration=+capDuration.toFixed(3);
      }
      const broll=this.linkedBroll(project,scene);
      for(const b of broll){
        const oldBD=Math.max(.05,Number(b.duration)||.05),newBD=Math.min(oldBD,Math.max(.05,newDuration*.72)),oldRoom=Math.max(.001,old.duration-oldBD),ratio=Math.max(0,Math.min(1,((Number(b.start)||old.start)-old.start)/oldRoom)),newRoom=Math.max(0,newDuration-newBD);
        b.start=+(newStart+ratio*newRoom).toFixed(3);b.duration=+newBD.toFixed(3);
      }
    }
    return {changed,boundaries:snapped,beats:beats.length,sceneCount:scenes.length};
  }
}
if(typeof window!=='undefined')window.ProfitMenteBeatSyncEngine=ProfitMenteBeatSyncEngine;
if(typeof module!=='undefined')module.exports=ProfitMenteBeatSyncEngine;
