import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./render-job-client.js',import.meta.url),'utf8');
const context={console,module:{exports:{}},exports:{},setTimeout,Blob,globalThis:{}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'render-job-client.js'});
const Client=context.module.exports;
assert.equal(typeof Client,'function');

const mp4Bytes=extra=>new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0,0,0,0,0x69,0x73,0x6f,0x6d,0x6d,0x70,0x34,0x32,...new Uint8Array(extra||16)]);
const validMp4=()=>new Blob([mp4Bytes()],{type:'video/mp4'});
function response({ok=true,status=200,body={},blob=validMp4()}={}){
  return {ok,status,async json(){return body},async blob(){return blob}};
}

{
  let calls=0;
  const retries=[];
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:3,fetchFn:async()=>{
    calls+=1;
    if(calls===1)throw new Error('socket reset');
    return response();
  }});
  client.attach('job-network');
  const blob=await client.result({onRetry:event=>retries.push(event)});
  assert.equal(blob.type,'video/mp4');
  assert.equal(calls,2);
  assert.equal(retries.length,1);
  assert.equal(retries[0].nextAttempt,2);
}

{
  let calls=0;
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:3,fetchFn:async()=>{
    calls+=1;
    if(calls===1)return response({ok:false,status:503,body:{error:'ocupado temporalmente'}});
    return response();
  }});
  client.attach('job-503');
  assert.equal((await client.result()).type,'video/mp4');
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

{
  let calls=0;
  const retries=[];
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:3,fetchFn:async()=>{
    calls+=1;
    if(calls===1)return response({blob:new Blob(['<html>gateway error</html>'],{type:'text/html'})});
    return response();
  }});
  client.attach('job-html-200');
  const blob=await client.result({onRetry:event=>retries.push(event)});
  assert.equal(blob.type,'video/mp4');
  assert.equal(calls,2,'HTTP 200 HTML must be rejected and retried');
  assert.equal(retries[0].code,'INVALID_RENDER_RESULT');
  assert.match(retries[0].error,/en lugar de video MP4/);
}

{
  let calls=0;
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:2,fetchFn:async()=>{
    calls+=1;
    return response({blob:new Blob(['tiny'],{type:'video/mp4'})});
  }});
  client.attach('job-truncated');
  await assert.rejects(()=>client.result(),/vacío o truncado/);
  assert.equal(calls,2,'truncated MP4 must exhaust integrity retries');
}

{
  let calls=0;
  const badHeader=new Blob([new Uint8Array(64)],{type:'video/mp4'});
  const client=new Client({interval:1,maxRetryDelay:1,resultMaxAttempts:2,fetchFn:async()=>{calls+=1;return response({blob:badHeader})}});
  client.attach('job-no-ftyp');
  await assert.rejects(()=>client.result(),/cabecera MP4 válida/);
  assert.equal(calls,2,'MP4 without ftyp signature must not be downloaded');
}

{
  const client=new Client({fetchFn:async()=>response()});
  const blob=validMp4();
  assert.equal(await client.validateResultBlob(blob),blob,'valid MP4 blob must pass integrity validation unchanged');
}

console.log('Render result retry and integrity regression passed');
