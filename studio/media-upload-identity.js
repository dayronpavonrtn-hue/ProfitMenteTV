(()=>{
  'use strict';
  // media-inspector.js auto-loads this integration point after media identity
  // is available. Keep the dedupe implementation in its existing module and
  // load it exactly once so real file uploads receive identity-based dedupe.
  if(globalThis.ProfitMenteMediaUploadDedupe) return;
  if(document.querySelector('script[data-profitmente-media-upload-dedupe]')) return;

  const script=document.createElement('script');
  script.src='media-upload-dedupe.js';
  script.async=false;
  script.dataset.profitmenteMediaUploadDedupe='1';
  script.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar media-upload-dedupe.js');
  document.head.appendChild(script);
})();
