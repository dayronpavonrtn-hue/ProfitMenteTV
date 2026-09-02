class ProfitMenteMediaTimelineDnD{
  static allowedTracks(type){
    if(type==='video'||type==='image')return [0,1];
    if(type==='audio')return [4,5,6];
    return [];
  }
  static canDrop(type,track){return this.allowedTracks(type).includes(Number(track))}
  static placement(asset,clientX,laneLeft,laneWidth,projectDuration){
    const total=Math.max(.25,Number(projectDuration)||.25),width=Math.max(1,Number(laneWidth)||1);
    const raw=(Number(clientX)-Number(laneLeft||0))/width*total;
    const start=Math.max(0,Math.min(total,raw));
    const native=asset?.type==='image'?5:(Number(asset?.duration)||8);
    const duration=Math.max(.25,native);
    return {start,duration,end:start+duration};
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaTimelineDnD=ProfitMenteMediaTimelineDnD;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaTimelineDnD;

(function integrateMediaTimelineDnD(){
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof drawLibrary!=='function'||typeof addClip!=='function')return;
  const library=document.querySelector('#mediaLibrary'),tracksHost=document.querySelector('#tracks');
  if(!library||!tracksHost)return;
  if(!document.querySelector('#profitmenteMediaTimelineDnDStyle')){
    const style=document.createElement('style');style.id='profitmenteMediaTimelineDnDStyle';
    style.textContent='.mediaCard[draggable="true"]{cursor:grab}.mediaCard[draggable="true"]:active{cursor:grabbing}.lane.mediaAssetDrop{outline:2px solid rgba(122,215,255,.9);outline-offset:-2px;background:rgba(122,215,255,.08)}';
    document.head.appendChild(style);
  }
  function markCards(){
    const cards=[...library.querySelectorAll('.mediaCard')];
    cards.forEach((card,index)=>{const asset=assets[index];if(!asset)return;card.draggable=true;card.dataset.assetId=asset.id;card.title=`Arrastra ${asset.name} a una pista compatible o haz clic para añadirlo al cursor`});
  }
  const baseDraw=drawLibrary;
  drawLibrary=function(){baseDraw();markCards()};
  markCards();
  library.addEventListener('dragstart',e=>{
    const card=e.target.closest?.('.mediaCard');if(!card)return;
    const asset=assets.find(a=>a.id===card.dataset.assetId);if(!asset)return;
    e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-profitmente-asset',asset.id);e.dataTransfer.setData('text/plain',asset.id);
  });
  tracksHost.addEventListener('dragover',e=>{
    const lane=e.target.closest?.('.lane');if(!lane)return;
    const id=e.dataTransfer.getData('application/x-profitmente-asset')||e.dataTransfer.getData('text/plain'),asset=assets.find(a=>a.id===id);
    if(!asset||!ProfitMenteMediaTimelineDnD.canDrop(asset.type,lane.dataset.track))return;
    e.preventDefault();e.dataTransfer.dropEffect='copy';lane.classList.add('mediaAssetDrop');
  });
  tracksHost.addEventListener('dragleave',e=>{const lane=e.target.closest?.('.lane');if(lane&&!lane.contains(e.relatedTarget))lane.classList.remove('mediaAssetDrop')});
  tracksHost.addEventListener('drop',e=>{
    const lane=e.target.closest?.('.lane');if(!lane)return;
    const id=e.dataTransfer.getData('application/x-profitmente-asset')||e.dataTransfer.getData('text/plain'),asset=assets.find(a=>a.id===id),track=Number(lane.dataset.track);
    lane.classList.remove('mediaAssetDrop');if(!asset)return;
    if(!ProfitMenteMediaTimelineDnD.canDrop(asset.type,track)){setStatus?.('Ese tipo de medio no es compatible con esta pista');return}
    e.preventDefault();
    const rect=lane.getBoundingClientRect(),place=ProfitMenteMediaTimelineDnD.placement(asset,e.clientX,rect.left,rect.width,project.duration),previousDuration=Number(project.duration)||.25;
    const expandedDuration=Math.max(previousDuration,place.end);
    if(expandedDuration>previousDuration){project.duration=expandedDuration;if(typeof syncForm==='function')syncForm()}
    let created;
    try{created=addClip(track,asset.name,asset.id,place.start,place.duration)}catch(error){project.duration=previousDuration;if(typeof syncForm==='function')syncForm();throw error}
    if(created===null){project.duration=previousDuration;if(typeof syncForm==='function')syncForm();return}
    setStatus?.(`${asset.name} añadido a la pista ${track} en ${place.start.toFixed(2)}s`);
  });
  document.addEventListener('dragend',()=>tracksHost.querySelectorAll('.mediaAssetDrop').forEach(x=>x.classList.remove('mediaAssetDrop')));
  window.profitMenteMediaTimelineDnD=ProfitMenteMediaTimelineDnD;
})();
