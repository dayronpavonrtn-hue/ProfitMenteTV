(()=>{
  if(typeof document==='undefined'||window.ProfitMenteRenderRecovery)return;
  const renderBtn=document.querySelector('#renderMp4Btn');
  const validation=window.ProfitMenteAsyncRenderValidation;
  if(!renderBtn||!validation?.resumeSavedJob||!validation?.readSession)return;

  let recovering=false;
  let recoverBtn=document.querySelector('#recoverRenderBtn');
  if(!recoverBtn){
    recoverBtn=document.createElement('button');
    recoverBtn.id='recoverRenderBtn';
    recoverBtn.type='button';
    recoverBtn.textContent='↻ Recuperar render';
    recoverBtn.title='Reconectar con el último render local conservado sin volver a renderizar';
    recoverBtn.hidden=true;
    const cancelBtn=document.querySelector('#cancelRenderBtn');
    (cancelBtn||renderBtn).insertAdjacentElement('afterend',recoverBtn);
  }

  function hasRecoverableSession(){
    try{return !!validation.readSession()?.jobId}catch{return false}
  }
  function sync(){
    const available=hasRecoverableSession();
    recoverBtn.hidden=!available;
    recoverBtn.disabled=recovering||!available;
    recoverBtn.setAttribute('aria-busy',recovering?'true':'false');
    return available;
  }
  async function recover(){
    if(recovering||!hasRecoverableSession())return false;
    recovering=true;sync();
    try{return !!(await validation.resumeSavedJob())}
    finally{recovering=false;sync()}
  }

  recoverBtn.addEventListener('click',recover);
  window.addEventListener('storage',event=>{
    if(event?.key==='profitmente.activeRenderJob.v1')sync();
  });
  const timer=setInterval(sync,1000);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  setTimeout(sync,0);

  window.ProfitMenteRenderRecovery={recover,sync,hasRecoverableSession,get recovering(){return recovering}};
})();
