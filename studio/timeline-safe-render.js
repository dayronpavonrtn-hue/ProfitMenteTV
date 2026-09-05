(()=>{
  if(typeof document==='undefined')return;

  function safeTrackId(value,trackNames){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    const text=String(value).trim();
    if(!text)return null;
    const number=Number(text);
    return Number.isInteger(number)&&number>=0&&number<trackNames.length?number:null;
  }

  function createClipElement(clip,duration,onPointerDown,onEdit){
    const el=document.createElement('div');
    el.className='clip';
    el.dataset.id=String(clip?.id??'');
    const projectDuration=Math.max(.001,Number(duration)||1);
    const start=Number.isFinite(Number(clip?.start))?Number(clip.start):0;
    const clipDuration=Number.isFinite(Number(clip?.duration))?Number(clip.duration):.25;
    el.style.left=`${start/projectDuration*100}%`;
    el.style.width=`${Math.max(2,clipDuration/projectDuration*100)}%`;
    // Clip names can come from imported JSON/bundles. Keep them inert text so a
    // project can never inject markup or event handlers into the Studio timeline.
    el.textContent=String(clip?.name??'');
    el.onpointerdown=event=>onPointerDown?.(event,el);
    el.ondblclick=event=>{event.stopPropagation?.();onEdit?.(el.dataset.id)};
    return el;
  }

  function renderTimeline({project,tracks,trackNames,onPointerDown,onEdit,onAddClip}){
    if(!tracks||!project)return false;
    const names=Array.isArray(trackNames)?trackNames:[];
    const clips=Array.isArray(project.clips)?project.clips:[];
    const duration=Math.max(.001,Number(project.duration)||1);
    tracks.replaceChildren();

    names.forEach((name,index)=>{
      const row=document.createElement('div');
      row.className='track';
      const label=document.createElement('span');
      label.textContent=String(name);
      const lane=document.createElement('div');
      lane.className='lane';
      lane.dataset.track=String(index);
      lane.ondblclick=event=>{
        if(event.target!==lane)return;
        const width=Math.max(1,Number(lane.clientWidth)||1);
        const offset=Number.isFinite(Number(event.offsetX))?Number(event.offsetX):0;
        const start=Math.max(0,Math.min(Math.max(0,duration-1),offset/width*duration));
        onAddClip?.(index,'Nuevo clip',null,start,5);
      };
      for(const clip of clips){
        if(safeTrackId(clip?.track,names)!==index)continue;
        lane.appendChild(createClipElement(clip,duration,onPointerDown,onEdit));
      }
      row.append(label,lane);
      tracks.appendChild(row);
    });
    return true;
  }

  function wire(){
    if(typeof tracks==='undefined'||typeof names==='undefined')return false;
    drawTimeline=function(){
      return renderTimeline({
        project,
        tracks,
        trackNames:names,
        onPointerDown:(event,el)=>startDrag(event,el),
        onEdit:id=>editClip(id),
        onAddClip:(track,name,asset,start,duration)=>addClip(track,name,asset,start,duration)
      });
    };
    return true;
  }

  window.ProfitMenteTimelineSafeRenderer={safeTrackId,createClipElement,renderTimeline,wire};
  wire();
})();
