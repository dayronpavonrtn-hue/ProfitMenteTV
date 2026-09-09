class ProfitMenteRenderQueueStorageEngine{
  static DB_NAME='profitmente-studio';
  static STORE_NAME='render-queue';
  static RECORD_KEY='mp4:v1';
  constructor({indexedDBFactory=globalThis.indexedDB,localStorageRef=globalThis.localStorage,dbName=ProfitMenteRenderQueueStorageEngine.DB_NAME,storeName=ProfitMenteRenderQueueStorageEngine.STORE_NAME,key=ProfitMenteRenderQueueStorageEngine.RECORD_KEY}={}){
    this.indexedDBFactory=indexedDBFactory;
    this.localStorageRef=localStorageRef;
    this.dbName=dbName;
    this.storeName=storeName;
    this.key=key;
  }
  hasBinary(value,seen=new Set()){
    if(value==null)return false;
    if(typeof Blob!=='undefined'&&value instanceof Blob)return true;
    if(typeof File!=='undefined'&&value instanceof File)return true;
    if(typeof value!=='object'||seen.has(value))return false;
    seen.add(value);
    if(Array.isArray(value))return value.some(item=>this.hasBinary(item,seen));
    return Object.values(value).some(item=>this.hasBinary(item,seen));
  }
  open(){
    if(!this.indexedDBFactory?.open)return Promise.resolve(null);
    return new Promise((resolve,reject)=>{
      const request=this.indexedDBFactory.open(this.dbName,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(this.storeName))db.createObjectStore(this.storeName);
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('No se pudo abrir IndexedDB'));
    });
  }
  async save(state){
    if(!state||typeof state!=='object')return false;
    const db=await this.open();
    if(db){
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readwrite');
          tx.objectStore(this.storeName).put(state,this.key);
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('No se pudo guardar la cola'));
          tx.onabort=()=>reject(tx.error||new Error('Guardado de cola cancelado'));
        });
        return true;
      }finally{db.close?.()}
    }
    if(this.hasBinary(state))return false;
    try{this.localStorageRef?.setItem?.(this.key,JSON.stringify(state));return true}catch{return false}
  }
  async load(){
    const db=await this.open();
    if(db){
      try{
        return await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readonly');
          const request=tx.objectStore(this.storeName).get(this.key);
          request.onsuccess=()=>resolve(request.result||null);
          request.onerror=()=>reject(request.error||new Error('No se pudo leer la cola'));
        });
      }finally{db.close?.()}
    }
    try{
      const raw=this.localStorageRef?.getItem?.(this.key);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }
  async clear(){
    const db=await this.open();
    if(db){
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readwrite');
          tx.objectStore(this.storeName).delete(this.key);
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('No se pudo limpiar la cola'));
          tx.onabort=()=>reject(tx.error||new Error('Limpieza de cola cancelada'));
        });
      }finally{db.close?.()}
    }
    try{this.localStorageRef?.removeItem?.(this.key)}catch{}
    return true;
  }
}
if(typeof window!=='undefined')window.ProfitMenteRenderQueueStorageEngine=ProfitMenteRenderQueueStorageEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderQueueStorageEngine;
