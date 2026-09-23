const assert=require('assert');
const ProfitMenteRenderJobClient=require('./render-job-client.js');

(async()=>{
  let calls=[];
  const fetchFn=async(url,options={})=>{
    calls.push({url,method:options.method||'GET'});
    if(options.method==='DELETE')return {ok:true,json:async()=>({status:'rendering'})};
    throw new Error('unexpected request');
  };
  const client=new ProfitMenteRenderJobClient({fetchFn,requestTimeoutMs:1000});
  client.attach('job-123');
  await assert.rejects(()=>client.cancel(),err=>{
    assert.strictEqual(err.code,'CANCEL_NOT_CONFIRMED');
    assert.strictEqual(err.retryable,true);
    return true;
  });
  assert.strictEqual(client.cancelled,false,'client must remain active when server does not confirm cancellation');
  assert.deepStrictEqual(calls,[{url:'/api/render/jobs/job-123',method:'DELETE'}]);

  client.fetchFn=async(url,options={})=>{
    calls.push({url,method:options.method||'GET'});
    return {ok:true,json:async()=>({status:'cancelled'})};
  };
  const result=await client.cancel();
  assert.strictEqual(result.status,'cancelled');
  assert.strictEqual(client.cancelled,true,'client should mark cancellation only after server confirmation');
  console.log('render job cancellation confirmation regression OK');
})().catch(error=>{console.error(error);process.exit(1)});
