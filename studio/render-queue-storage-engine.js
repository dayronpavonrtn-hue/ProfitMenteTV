class ProfitMenteRenderQueueStorageEngine{
  static DB_NAME='profitmente-studio-render-queue';
  static STORE_NAME='render-queue';
  static RECORD_KEY='mp4:v1';
  static FALLBACK_ENVELOPE_VERSION=1;
  constructor({indexedDBFactory=globalThis.indexedDB,localStorageRef=globalThis.localStorage,dbName=ProfitMenteRenderQueueStorageEngine.DB_NAME,storeName=ProfitMenteRenderQueueStorageEngine.STORE_NAME,key=ProfitMenteRenderQueueStorageEngine.RECORD_KEY}={}){
    this.indexedDBFactory=indexedDBFactory;
    this.localStorageRef=localStorageRef;
    this.dbName=dbName;
    this.storeName=storeName;
    this.key=key;
  }
  hasStructuredValue(value,seen=new Set()){
    if(value===undefined)return true;
    if(value==null)return false;
    const type=typeof value;
    if(type==='bigint'||type==='function'||type==='symbol')return true;
    if(type==='number'&&!Number.isFinite(value))return true;
    if(typeof Blob!=='undefined'&&value instanceof Blob)return true;
    if(typeof File!=='undefined'&&value instanceof File)return true;
    if(typeof ArrayBuffer!=='undefined'&&value instanceof ArrayBuffer)return true;
    if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(value))return true;
    if(typeof Map!=='undefined'&&value instanceof Map)return true;
    if(typeof Set!=='undefined'&&value instanceof Set)return true;
    if(typeof Date!=='undefined'&&value instanceof Date)return true;
    if(typeof RegExp!=='undefined'&&value instanceof RegExp)return true;
    if(type!=='object'||seen.has(value))return false;
    seen.add(value);
    if(Array.isArray(value)){
      for(let index=0;index<value.length;index++){
        if(!Object.prototype.hasOwnProperty.call(value,index))return true;
        if(this.hasStructuredValue(value[index],seen))return true;
      }
      const extraKeys=Reflect.ownKeys(value).filter(key=>key!=='length'&&!(typeof key==='string'&&/^(0|[1-9]\d*)$/.test(key)&&Number(key)<value.length));
      return extraKeys.length>0;
    }
    const proto=Object.getPrototypeOf(value);
    if(proto!==Object.prototype&&proto!==null)return true;
    for(const key of Reflect.ownKeys(value)){
      if(typeof key==='symbol')return true;
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(!descriptor?.enumerable||descriptor.get||descriptor.set)return true;
      if(key==='toJSON'&&typeof value[key]==='function')return true;
      if(this.hasStructuredValue(value[key],seen))return true;
    }
    return false;
  }
  hasBinary(value,seen=new Set()){return this.hasStructuredValue(value,seen)}
  checksum(text){
    // Small deterministic integrity tag for the JSON-only emergency fallback.
    // This is corruption detection, not a cryptographic signature.
    let hash=0x811c9dc5;
    for(let index=0;index<text.length;index++){
      hash^=text.charCodeAt(index);
      hash=Math.imul(hash,0x01000193)>>>0;
    }
    return hash.toString(16).padStart(8,'0');
  }
  encodeFallback(state){
    const payload=JSON.stringify(state);
    return JSON.stringify({v:ProfitMenteRenderQueueStorageEngine.FALLBACK_ENVELOPE_VERSION,checksum:this.checksum(payload),payload});
  }
  decodeFallback(raw){
    if(!raw)return null;
    let parsed;
    try{parsed=JSON.parse(raw)}catch{return null}
    // Backward compatibility with queue states written before the integrity envelope.
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Object.hasOwn(parsed,'payload'))return parsed;
    if(parsed.v!==ProfitMenteRenderQueueStorageEngine.FALLBACK_ENVELOPE_VERSION||typeof parsed.payload!=='string'||typeof parsed.checksum!=='string')return null;
    if(this.checksum(parsed.payload)!==parsed.checksum)return null;
    try{return JSON.parse(parsed.payload)}catch{return null}
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
  saveFallback(state){
    // localStorage is JSON-only. Reject anything JSON would drop, coerce or corrupt.
    if(this.hasStructuredValue(state))return false;
    try{
      const encoded=this.encodeFallback(state);
      this.localStorageRef?.setItem?.(this.key,encoded);
      // Some storage shims/failure modes can report success without durable bytes.
      const persisted=this.localStorageRef?.getItem?.(this.key);
      if(persisted!==encoded){try{this.localStorageRef?.removeItem?.(this.key)}catch{};return false}
      return true;
    }catch{return false}
  }
  loadFallback(){
    try{return this.decodeFallback(this.localStorageRef?.getItem?.(this.key))}catch{return null}
  }
  async save(state){
    if(!state||typeof state!=='object')return false;
    let db=null;
    try{db=await this.open()}catch{}
    if(db){
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readwrite');
          tx.objectStore(this.storeName).put(state,this.key);
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('No se pudo guardar la cola'));
          tx.onabort=()=>reject(tx.error||new Error('Guardado de cola cancelado'));
        });
        try{this.localStorageRef?.removeItem?.(this.key)}catch{}
        return true;
      }catch{}
      finally{db.close?.()}
    }
    return this.saveFallback(state);
  }
  async load(){
    let db=null;
    try{db=await this.open()}catch{}
    if(db){
      try{
        const state=await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readonly');
          const request=tx.objectStore(this.storeName).get(this.key);
          request.onsuccess=()=>resolve(request.result??null);
          request.onerror=()=>reject(request.error||new Error('No se pudo leer la cola'));
        });
        if(state!=null)return state;
      }catch{}
      finally{db.close?.()}
    }
    return this.loadFallback();
  }
  async clear(){
    let db=null;
    try{db=await this.open()}catch{}
    if(db){
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(this.storeName,'readwrite');
          tx.objectStore(this.storeName).delete(this.key);
          tx.oncomplete=()=>resolve();
          tx.onerror=()=>reject(tx.error||new Error('No se pudo limpiar la cola'));
          tx.onabort=()=>reject(tx.error||new Error('Limpieza de cola cancelada'));
        });
      }catch{}
      finally{db.close?.()}
    }
    try{this.localStorageRef?.removeItem?.(this.key)}catch{}
    return true;
  }
}
if(typeof window!=='undefined')window.ProfitMenteRenderQueueStorageEngine=ProfitMenteRenderQueueStorageEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderQueueStorageEngine;
