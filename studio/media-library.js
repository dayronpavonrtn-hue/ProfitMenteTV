(()=>{
  const KEY='profitmente_studio_media_v1';
  const listeners=new Set();
  const safeParse=value=>{try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?parsed:[];}catch{return [];}};
  const load=()=>safeParse(localStorage.getItem(KEY)).filter(x=>x&&typeof x==='object'&&typeof x.id==='string');
  let items=load();
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(items.map(({url,...x})=>x)));}catch{}}
  const emit=()=>{const snapshot=items.map(x=>({...x}));listeners.forEach(fn=>{try{fn(snapshot);}catch{}});};
  const normalizeMeta=(file,meta={})=>({
    id:String(meta.id||('m_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9))),
    name:String(meta.name||file?.name||'media'),
    type:String(meta.type||file?.type||'application/octet-stream'),
    size:Number.isSafeInteger(file?.size)&&file.size>0?file.size:(Number.isSafeInteger(meta.size)&&meta.size>0?meta.size:0),
    duration:Number.isFinite(meta.duration)&&meta.duration>=0?meta.duration:0,
    width:Number.isFinite(meta.width)&&meta.width>0?meta.width:0,
    height:Number.isFinite(meta.height)&&meta.height>0?meta.height:0,
    importedAt:Number.isFinite(meta.importedAt)?meta.importedAt:Date.now(),
    fingerprint:typeof meta.fingerprint==='string'?meta.fingerprint:''
  });
  const identity=x=>x&&x.fingerprint&&x.size>0&&x.type?`${x.fingerprint}|${x.size}|${x.type}`:'';
  const add=(file,meta={})=>{
    const item=normalizeMeta(file,meta);
    if(!item.size)throw new Error('El archivo está vacío o no se puede leer.');
    const key=identity(item);
    if(key){const existing=items.find(x=>identity(x)===key);if(existing)return {...existing,duplicate:true};}
    if(file instanceof Blob){try{item.url=URL.createObjectURL(file);}catch{}}
    items=[item,...items].slice(0,250);
    persist();emit();return {...item};
  };
  const remove=id=>{const old=items.find(x=>x.id===id);if(old?.url){try{URL.revokeObjectURL(old.url);}catch{}}items=items.filter(x=>x.id!==id);persist();emit();};
  const clear=()=>{items.forEach(x=>{if(x.url)try{URL.revokeObjectURL(x.url);}catch{}});items=[];persist();emit();};
  const list=()=>items.map(x=>({...x}));
  const subscribe=fn=>{if(typeof fn!=='function')return()=>{};listeners.add(fn);fn(list());return()=>listeners.delete(fn);};
  window.ProfitMenteMediaLibrary={add,remove,clear,list,subscribe,identity,storageKey:KEY};
})();