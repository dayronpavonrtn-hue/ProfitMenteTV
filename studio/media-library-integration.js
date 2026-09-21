(()=>{
  const lib=window.ProfitMenteMediaLibrary;
  if(!lib)return;
  const input=document.getElementById('fileInput');
  const grid=document.getElementById('mediaGrid');
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=type=>type.startsWith('video/')?'🎬':type.startsWith('audio/')?'🎵':type.startsWith('image/')?'🖼️':'📄';
  const render=items=>{
    if(!grid)return;
    if(!items.length){grid.innerHTML='<div class="media-item" style="grid-column:1/-1"><div class="media-name">Importa imágenes, video o audio. Todo permanece local.</div></div>';return;}
    grid.innerHTML=items.map(x=>`<div class="media-item" data-media-id="${escapeHtml(x.id)}" draggable="true" title="${escapeHtml(x.name)}"><div class="media-thumb">${icon(x.type)}</div><div class="media-name">${escapeHtml(x.name)}</div></div>`).join('');
  };
  lib.subscribe(render);
  grid?.addEventListener('dragstart',e=>{const card=e.target.closest('[data-media-id]');if(!card)return;const item=lib.list().find(x=>x.id===card.dataset.mediaId);if(!item)return;e.dataTransfer?.setData('application/x-profitmente-media',JSON.stringify(item));e.dataTransfer?.setData('text/plain',item.name);});
  input?.addEventListener('change',async()=>{
    const files=[...(input.files||[])];
    for(const file of files){
      try{
        let fingerprint='';
        if(file.size>0&&crypto?.subtle){const head=await file.slice(0,Math.min(file.size,1024*1024)).arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',head);fingerprint=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
        lib.add(file,{fingerprint});
      }catch(err){console.warn('[ProfitMente Studio] Media import rejected:',err);}
    }
    input.value='';
  });
  window.ProfitMenteStudioMedia={library:lib,refresh:()=>render(lib.list())};
})();