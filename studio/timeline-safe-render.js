(()=>{
  if(typeof document==='undefined'||window.ProfitMenteTimelineSafeRender)return;

  function clipIdValue(value){
    return value===null||value===undefined?'':String(value);
  }

  function createClipElement(clip){
    const el=document.createElement('div');
    el.className='clip';
    el.dataset.id=clipIdValue(clip?.id);
    const duration=Math.max(0,Number(project?.duration)||0);
    const start=Math.max(0,Number(clip?.start)||0);
    const clipDuration=Math.max(0,Number(clip?.duration)||0);
    const denominator=duration>0?duration:1;
    el.style.left=`${start/denominator*100}%`;
    el.style.width=`${Math.max(2,clipDuration/denominator*100)}%`;
    el.textContent=String(clip?.name??'Clip');
    el.onpointerdown=e=>startDrag(e,el);
    el.ondblclick=e=>{e.stopPropagation();editClip(el.dataset.id)};
    return el;
  }

  function drawTimelineSafe(){
    tracks.replaceChildren();
    names.forEach((name,index)=>{
      const row=document.createElement('div');
      row.className='track';

      const label=document.createElement('span');
      label.textContent=String(name);
      row.appendChild(label);

      const lane=document.createElement('div');
      lane.className='lane';
      lane.dataset.track=String(index);
      lane.ondblclick=e=>{
        if(e.target!==lane)return;
        const width=Math.max(1,Number(lane.clientWidth)||1);
        const duration=Math.max(1,Number(project?.duration)||1);
        const start=Math.max(0,Math.min(duration-1,(Number(e.offsetX)||0)/width*duration));
        addClip(index,'Nuevo clip',null,start,5);
      };

      for(const clip of project?.clips||[]){
        if(trackId(clip?.track)!==index)continue;
        lane.appendChild(createClipElement(clip));
      }
      row.appendChild(lane);
      tracks.appendChild(row);
    });
  }

  const originalDrawTimeline=typeof drawTimeline==='function'?drawTimeline:null;
  drawTimeline=drawTimelineSafe;
  window.ProfitMenteTimelineSafeRender={drawTimeline:drawTimelineSafe,createClipElement,clipIdValue,originalDrawTimeline};
})();
