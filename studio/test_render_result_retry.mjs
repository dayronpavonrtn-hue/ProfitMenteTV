import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./render-job-client.js',import.meta.url),'utf8');
const context={console,module:{exports:{}},exports:{},setTimeout,globalThis:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'render-job-client.js'});
const Client=context.module.exports;
assert.equal(typeof Client,'function');

function response({ok=true,status=200,body={},blob='mp4'}={}){
  return {ok,status,async json(){return body},async blob(){return blob}};
}

{
  let calls=0;
  const retries=[];
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:3,fetchFn:async()=>{
    calls+=1;
    if(calls===1)throw new Error('socket reset');
    return response({blob:'video-after-network-retry'});
  }});
  client.attach('job-network');
  const blob=await client.result({onRetry:event=>retries.push(event)});
  assert.equal(blob,'video-after-network-retry');
  assert.equal(calls,2);
  assert.equal(retries.length,1);
  assert.equal(retries[0].nextAttempt,2);
}

{
  let calls=0;
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:3,fetchFn:async()=>{
    calls+=1;
    if(calls===1)return response({ok:false,status:503,body:{error:'ocupado temporalmente'}});
    return response({blob:'video-after-503'});
  }});
  client.attach('job-503');
  assert.equal(await client.result(),'video-after-503');
  assert.equal(calls,2);
}

{
  let calls=0;
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:3,fetchFn:async()=>{
    calls+=1;
    return response({ok:false,status:409,body:{error:'todavía no terminado'}});
  }});
  client.attach('job-conflict');
  await assert.rejects(()=>client.result(),/todavía no terminado/);
  assert.equal(calls,1,'non-retryable client errors must fail immediately');
}

{
  let calls=0;
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:2,fetchFn:async()=>{
    calls+=1;
    throw new Error('offline');
  }});
  client.attach('job-offline');
  await assert.rejects(()=>client.result(),/offline/);
  assert.equal(calls,2,'download retries must respect resultMaxAttempts');
}

console.log('Render result retry regression passed');
