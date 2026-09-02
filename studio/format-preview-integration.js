(()=>{
  const FORMATS={
    '9:16':{width:540,height:960,ratio:'9 / 16'},
    '16:9':{width:960,height:540,ratio:'16 / 9'},
    '1:1':{width:720,height:720,ratio:'1 / 1'}
  };
  function config(format){return FORMATS[format]||FORMATS['9:16']}
  function applyFormatPreview(format=project?.format){
    const next=config(format),frame=document.querySelector('.phone');
    if(canvas.width!==next.width)canvas.width=next.width;
    if(canvas.height!==next.height)canvas.height=next.height;
    if(frame){frame.dataset.format=FORMATS[format]?format:'9:16';frame.style.aspectRatio=next.ratio}
    return next;
  }
  const baseSyncForm=syncForm;
  syncForm=function(){
    baseSyncForm();
    applyFormatPreview(project?.format);
  };
  applyFormatPreview(project?.format);
  window.ProfitMenteFormatPreview={FORMATS,config,apply:applyFormatPreview};
})();
