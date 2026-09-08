(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ProfitMenteStartupRecoveryNoticeEngine=api.ProfitMenteStartupRecoveryNoticeEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteStartupRecoveryNoticeEngine{
    static message(meta={}){
      switch(meta?.reason){
        case 'last-good-project-recovered': return 'Studio recuperó automáticamente la última versión válida del proyecto.';
        case 'corrupt-project-storage': return 'Studio aisló un proyecto local dañado y abrió un proyecto seguro.';
        case 'storage-unavailable': return 'Studio está trabajando en memoria porque el almacenamiento local no está disponible.';
        default: return '';
      }
    }
    static safeFileName(name='profitmente-project-recovery'){
      return String(name||'profitmente-project-recovery').normalize('NFKD').replace(/[^\w\-. ]+/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'profitmente-project-recovery';
    }
    static readBackup(storage,key){
      if(!storage||!key||typeof storage.getItem!=='function')return null;
      try{const raw=storage.getItem(key);return typeof raw==='string'&&raw.length?raw:null}catch{return null}
    }
  }
  return {ProfitMenteStartupRecoveryNoticeEngine};
});

if(typeof document!=='undefined')(()=>{
  const meta=window.__profitmenteStartupRecovered,Engine=window.ProfitMenteStartupRecoveryNoticeEngine;
  if(!meta||!Engine||window.ProfitMenteStartupRecoveryNotice)return;
  const message=Engine.message(meta);if(!message)return;
  const aside=document.querySelector('aside');if(!aside)return;
  const section=document.createElement('section');section.className='startupRecoveryNotice';
  const title=document.createElement('h3');title.textContent='Recuperación automática';
  const text=document.createElement('p');text.textContent=message;
  const actions=document.createElement('div');actions.className='projectLibraryActions';
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='✓ Entendido';actions.appendChild(dismiss);
  const raw=Engine.readBackup(window.localStorage,meta.backupKey);
  let download=null;
  if(raw){
    download=document.createElement('button');download.type='button';download.textContent='⇩ Descargar copia aislada';download.title='Guardar el contenido local que Studio aisló antes de recuperarse';actions.insertBefore(download,dismiss);
    download.addEventListener('click',()=>{
      const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=Engine.safeFileName(project?.name||'profitmente-project-recovery')+'-aislado.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
      if(typeof setStatus==='function')setStatus('Copia aislada descargada · el proyecto recuperado sigue activo');
    });
  }
  section.append(title,text,actions);aside.insertBefore(section,aside.firstChild);
  dismiss.addEventListener('click',()=>{section.remove();try{document.documentElement.dataset.projectRecoveryNotice='dismissed'}catch{}});
  function announce(){if(section.isConnected&&typeof setStatus==='function')setStatus(message)}
  window.addEventListener('profitmente:features-ready',announce,{once:true});
  queueMicrotask(()=>{try{document.documentElement.dataset.projectRecoveryNotice=meta.reason||'recovered'}catch{};announce()});
  setTimeout(announce,200);
  window.ProfitMenteStartupRecoveryNotice={message,backupAvailable:!!raw,dismiss:()=>dismiss.click()};
})();
