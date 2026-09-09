(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ProfitMenteMediaIdentityEngine=api.ProfitMenteMediaIdentityEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteMediaIdentityEngine{
    static key(value){
      if(typeof value==='number'){
        if(!Number.isSafeInteger(value)||value<0)return null;
        return `n:${Object.is(value,-0)?0:value}`;
      }
      if(typeof value!=='string')return null;
      const text=value.trim();
      if(!text)return null;
      if(/^(0|[1-9]\d*)$/.test(text)){
        const number=Number(text);
        return Number.isSafeInteger(number)?`n:${number}`:null;
      }
      return `s:${text}`;
    }
    static canonical(value){
      const key=this.key(value);
      return key==null?'':key.slice(2);
    }
    static same(a,b){
      const x=this.key(a),y=this.key(b);
      return x!==null&&x===y;
    }
    static uniqueIndex(items=[]){
      const map=new Map(),ambiguous=new Set();
      for(const item of Array.isArray(items)?items:[]){
        const key=this.key(item?.id);
        if(key==null||ambiguous.has(key))continue;
        if(map.has(key)){map.delete(key);ambiguous.add(key)}else map.set(key,item);
      }
      return {map,ambiguous};
    }
    static resolve(items,value){
      const key=this.key(value);
      if(key==null)return {status:'invalid',key:null,item:null};
      const index=this.uniqueIndex(items);
      if(index.ambiguous.has(key))return {status:'ambiguous',key,item:null};
      const item=index.map.get(key)||null;
      return item?{status:'ok',key,item}:{status:'missing',key,item:null};
    }
  }
  return {ProfitMenteMediaIdentityEngine};
});
