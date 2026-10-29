// Run in frontend container; does not drive the worker through queries.
import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
const base='http://127.0.0.1:3000';
async function request(path,method='GET',cookie,body) {
 const headers=new Headers();if(cookie)headers.set('cookie',cookie);if(method!=='GET')headers.set('origin',base);
 if(body&&!(body instanceof FormData)){headers.set('content-type','application/json');body=JSON.stringify(body);}
 return fetch(base+path,{method,headers,body});
}
async function json(path,method,cookie,body,status=200) {
 const response=await request(path,method,cookie,body);assert.equal(response.status,status,await response.clone().text());return response.json();
}
async function session(){const response=await request('/api/session','POST');assert.equal(response.status,200);return response.headers.getSetCookie()[0].split(';')[0];}
async function asset(owner){
 const png=await (await request('/api/demo/portrait.png')).arrayBuffer();const form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'portrait.png');
 return (await json('/api/assets','POST',owner,form,201)).id;
}
const delays=ms=>({ASSET_CHECK:ms,GENERATE:ms,FINALIZE:ms});
async function submit(owner,id,simulation){return (await json('/api/jobs','POST',owner,{templateId:'demo-portrait',assetIds:[id],simulation},202)).job;}
const mode=process.env.VERIFY_MODE??'normal';
if(mode==='restart-prepare') {
 const owner=await session(),id=await asset(owner);
 const completed=await submit(owner,id,{stageDurationsMs:delays(0)});
 await new Promise(resolve=>setTimeout(resolve,300));
 const stable=(await json('/api/jobs/'+completed.id,'GET',owner)).job;assert.equal(stable.status,'SUCCEEDED');
 const active=await submit(owner,id,{stageDurationsMs:delays(10000)});
 await new Promise(resolve=>setTimeout(resolve,200));
 const queued=await submit(owner,id,{stageDurationsMs:delays(0)});
 await writeFile('/tmp/studio-004-restart.json',JSON.stringify({owner,stable,ids:[active.id,queued.id]}),{mode:0o600});
 console.log('PREPARED: one running and one queued task; restart backend now');
} else if(mode==='restart-check') {
 const {owner,stable,ids}=JSON.parse(await readFile('/tmp/studio-004-restart.json','utf8'));
 for(const id of ids){const job=(await json('/api/jobs/'+id,'GET',owner)).job;assert.equal(job.status,'FAILED');assert.equal(job.errorCode,'PROCESS_INTERRUPTED');const events=await json('/api/jobs/'+id+'/events','GET',owner);assert.equal(events.items.at(-1).kind,'INTERRUPTED');}
 assert.deepEqual((await json('/api/jobs/'+stable.id,'GET',owner)).job,stable);
 assert.equal((await request(stable.resultUrl,'GET',owner)).status,200);
 await request('/api/session','DELETE',owner);console.log('PASS: real backend restart interrupts active/queued tasks and retains successful snapshot/result');
} else {
 const owner=await session(),stranger=await session();
 try {
  const id=await asset(owner);
  const success=await submit(owner,id,{stageDurationsMs:delays(0)});
  const failures=[];for(const stage of ['ASSET_CHECK','GENERATE','FINALIZE'])failures.push([stage,await submit(owner,id,{failStage:stage,stageDurationsMs:delays(0)})]);
  // Leave workers alone: no status/event requests during execution.
  await new Promise(resolve=>setTimeout(resolve,1000));
  const stable=(await json('/api/jobs/'+success.id,'GET',owner)).job;assert.equal(stable.status,'SUCCEEDED');assert.equal(stable.version,6);
  const history=await json('/api/jobs/'+success.id+'/events','GET',owner);assert.equal(history.items.length,6);
  assert.deepEqual(history.items.map(e=>e.stage+':'+e.kind),['ASSET_CHECK:STARTED','ASSET_CHECK:COMPLETED','GENERATE:STARTED','GENERATE:COMPLETED','FINALIZE:STARTED','FINALIZE:COMPLETED']);
  const image=await request(stable.resultUrl,'GET',owner);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/png/);assert.equal(image.headers.get('cache-control'),'no-store');
  assert.deepEqual([...new Uint8Array(await image.arrayBuffer()).slice(0,8)],[137,80,78,71,13,10,26,10]);
  for(const [stage,job] of failures){const failed=(await json('/api/jobs/'+job.id,'GET',owner)).job;assert.equal(failed.status,'FAILED');assert.equal(failed.stage,stage);assert.equal(failed.errorCode,'SIMULATED_FAILURE');const events=await json('/api/jobs/'+job.id+'/events','GET',owner);assert.equal(events.items.at(-1).kind,'FAILED');assert.equal(events.items.length,2*(['ASSET_CHECK','GENERATE','FINALIZE'].indexOf(stage)+1));}
  for(let n=0;n<10;n++)assert.deepEqual((await json('/api/jobs/'+success.id,'GET',owner)).job,stable);
  for(const suffix of ['', '/events','/result'])assert.equal((await request('/api/jobs/'+success.id+suffix,'GET',stranger)).status,404);
  assert.equal((await request('/api/jobs','POST',owner,{templateId:'demo-portrait',assetIds:[id],simulation:{stageDurationsMs:{GENERATE:10001}}})).status,422);
  const records=await json('/api/jobs','GET',owner);assert.ok(records.items.some(job=>job.id===success.id));
  console.log('PASS: no-query background success, ordered durable events, all three failure stages, stable terminal reads, private PNG and task isolation');
 }finally{await request('/api/session','DELETE',owner);await request('/api/session','DELETE',stranger);}
}
