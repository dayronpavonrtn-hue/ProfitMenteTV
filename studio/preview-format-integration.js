(()=>{
  if(typeof document==='undefined'||window.ProfitMentePreviewFormat)return;
  const canvas=document.querySelector('#previewCanvas'),formatSelect=document.querySelector('#format');
  if(!canvas||!formatSelect||!window.ProfitMentePreviewFormatEngine)return;
  const storageKey='profitmente-preview-quality';
  const quality=()=>{const q=localStorage.getItem(storageKey)||'full';return ['draft','balanced','full'].includes(q)?q:'full'};
  const apply=({rerender=true}={})=>{
    const format=formatSelect.value||project?.format||'9:16';
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
  apply({rerender:false});
  window.ProfitMentePreviewFormat={apply,get quality(){return quality()},setQuality(v){if(!['draft','balanced','full'].includes(v))return false;localStorage.setItem(storageKey,v);qualitySelect.value=v;apply();return true}};
})();
