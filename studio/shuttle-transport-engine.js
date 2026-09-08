(()=>{
  function scalarNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text))return null;
    const number=Number(text);
    return Number.isFinite(number)?number:null;
  }
  function duration(value,fallback=1){
    const number=scalarNumber(value);
    return number!==null&&number>0?number:fallback;
  }
  function clampTime(value,limit,fallback=0){
    const max=duration(limit,1),number=scalarNumber(value);
    return Math.max(0,Math.min(max,number===null?fallback:number));
  }
  function normalizeRate(value){
    const number=scalarNumber(value);
    return [-4,-2,-1,0,1,2,4].includes(number)?number:0;
  }
  function nextRate(current,key){
    current=normalizeRate(current);
    if(key==='K')return 0;
    if(key==='J'){
      if(current>0)return -1;
      if(current===0)return -1;
      return current===-1?-2:current===-2?-4:-4;
    }
    if(key==='L'){
      if(current<0)return 1;
      if(current===0)return 1;
      return current===1?2:current===2?4:4;
    }
    return current;
  }
  function advance(time,elapsedSeconds,rate,limit){
    const max=duration(limit,1),start=clampTime(time,max,0),elapsed=scalarNumber(elapsedSeconds),speed=normalizeRate(rate);
    if(elapsed===null||elapsed<0||speed===0)return {time:start,ended:false};
    const raw=start+elapsed*speed,next=Math.max(0,Math.min(max,raw));
    return {time:next,ended:speed<0?next<=0:next>=max};
  }
  const api={scalarNumber,duration,clampTime,normalizeRate,nextRate,advance};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.ProfitMenteShuttleTransportEngine=api;
})();
