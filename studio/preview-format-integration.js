(()=>{
  if(typeof document==='undefined'||window.ProfitMentePreviewFormat)return;
  const canvas=document.querySelector('#previewCanvas'),formatSelect=document.querySelector('#format');
  if(!canvas||!formatSelect||!window.ProfitMentePreviewFormatEngine)return;
  const storageKey='profitmente-preview-quality';
  const quality=()=>{const q=localStorage.getItem(storageKey)||'full';return ['draft','balanced','full'].includes(q)?q:'full'};
  const currentFormat=()=>formatSelect.value||project?.format||'9:16';
  const apply=({rerender=true}={})=>{
    const format=currentFormat();
    const result=ProfitMentePreviewFormatEngine.apply(canvas,format,quality());
    const out=ProfitMentePreviewFormatEngine.exportDimensions(format),meta=document.querySelector('#previewMeta');
    if(meta)meta.textContent=`${result.format} · ${out.width}×${out.height}`;
    if(result.changed&&rerender&&typeof renderAt==='function')Promise.resolve(renderAt(Number(document.querySelector('#playhead')?.value||0))).catch(()=>{});
    window.dispatchEvent(new CustomEvent('profitmente:previewformat',{detail:result}));
    return result;
  };
  const controls=document.createElement('label');controls.className='previewQualityControl';controls.title='Reduce solo la resolución del monitor. El MP4 final conserva la resolución de exportación.';
  controls.innerHTML='Preview <select id="previewQuality"><option value="full">Completa</option><option value="balanced">Equilibrada</option><option value="draft">Borrador</option></select>';
  const preview=document.querySelector('.preview');if(preview)preview.appendChild(controls);
  const qualitySelect=controls.querySelector('#previewQuality');qualitySelect.value=quality();
  qualitySelect.onchange=()=>{localStorage.setItem(storageKey,qualitySelect.value);apply()};
  formatSelect.addEventListener('change',()=>apply());
  if(typeof syncForm==='function'){
    const original=syncForm;
    syncForm=function(){original();apply({rerender:false})};
  }
  // The WebM renderer captures this canvas directly. Draft/balanced are monitor-only
  // modes, so temporarily restore the full canvas before capture and return to the
  // selected monitor quality after the recording finishes.
  const webmBtn=document.querySelector('#renderBtn'),originalWebmRender=webmBtn?.onclick;
  if(webmBtn&&typeof originalWebmRender==='function'){
    webmBtn.onclick=async function(event){
      const monitorQuality=quality();
      ProfitMentePreviewFormatEngine.apply(canvas,currentFormat(),'full');
      try{return await originalWebmRender.call(this,event)}
      finally{
        ProfitMentePreviewFormatEngine.apply(canvas,currentFormat(),monitorQuality);
        if(typeof renderAt==='function')Promise.resolve(renderAt(Number(document.querySelector('#playhead')?.value||0))).catch(()=>{});
      }
    };
  }
  apply({rerender:false});
  window.ProfitMentePreviewFormat={apply,get quality(){return quality()},setQuality(v){if(!['draft','balanced','full'].includes(v))return false;localStorage.setItem(storageKey,v);qualitySelect.value=v;apply();return true}};
})();
