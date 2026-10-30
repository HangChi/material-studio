// Dedicated dual-backend test project only. Never execute against the original volumes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,unlink} from 'node:fs/promises';
if(process.env.VERIFY_ISOLATED!=='true')throw Error('Set VERIFY_ISOLATED=true only in the disposable dual-worker project');
const base='http://127.0.0.1:3000',file='/tmp/material-013-fixture.json';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function request(path,{cookie,method='GET',body,key}={}){
 for(let n=0;n<50;n++)try{const headers=new Headers();if(cookie)headers.set('cookie',cookie);if(method!=='GET')headers.set('origin',base);if(key)headers.set('Idempotency-Key',key);if(body&&!(body instanceof FormData)){headers.set('content-type','application/json');body=JSON.stringify(body);}const r=await fetch(base+path,{method,headers,body});if(method==='GET'&&r.status>=500){await delay(100);continue;}assert.ok(r.ok,`${path}: ${r.status}`);return r;}catch(error){if(method!=='GET'||n===49)throw error;await delay(100);}throw Error('Read unavailable during failover');
}
async function json(path,options){return(await request(path,options)).json();}
async function batch(cookie,id,condition){for(let n=0;n<600;n++){const {batch}=await json('/api/batches/'+id,{cookie});if(condition(batch))return batch;await delay(100);}throw Error('Batch deadline exceeded');}
if(process.env.VERIFY_MODE==='prepare'){
 const response=await request('/api/session',{method:'POST'}),cookie=response.headers.getSetCookie()[0].split(';')[0];
 const bytes=await(await request('/api/demo/portrait.png')).arrayBuffer(),body=new FormData();body.append('file',new Blob([bytes],{type:'image/png'}),'fixture.png');const asset=await json('/api/assets',{cookie,method:'POST',body});
 const item=finalize=>({templateId:'demo-portrait',assetIds:[asset.id],simulation:{stageDurationsMs:{ASSET_CHECK:0,GENERATE:300,FINALIZE:finalize}}});
 const fast=(await json('/api/batches',{cookie,method:'POST',key:randomUUID(),body:{name:'双实例唯一领取验收',items:Array.from({length:4},()=>item(300))}})).batch;
 const completed=await batch(cookie,fast.id,b=>b.items.every(j=>['SUCCEEDED','FAILED'].includes(j.status)));assert.equal(completed.counts.succeeded,4);
 for(const job of completed.items){const {items}=await json(`/api/jobs/${job.id}/events`,{cookie});assert.equal(items.length,6);assert.deepEqual(items.map(e=>e.version),[1,2,3,4,5,6]);}
 const slow=(await json('/api/batches',{cookie,method:'POST',key:randomUUID(),body:{name:'双实例强杀接管验收',items:[item(10000),item(10000)]}})).batch;
 await batch(cookie,slow.id,b=>b.items.every(j=>j.status==='RUNNING'&&j.stage==='FINALIZE'));await delay(2000);
 await writeFile(file,JSON.stringify({cookie,fast:fast.id,slow:slow.id}),{mode:0o600});console.log(JSON.stringify({status:'ready-for-single-worker-kill',fast:fast.id,slow:slow.id}));
}else{
 const {cookie,fast,slow}=JSON.parse(await readFile(file,'utf8'));const done=await batch(cookie,slow,b=>b.items.every(j=>['SUCCEEDED','FAILED'].includes(j.status)));assert.equal(done.counts.succeeded,2);assert.deepEqual(done.items.map(j=>j.attempt).sort(),[1,2]);
 for(const job of done.items){const {items}=await json(`/api/jobs/${job.id}/events`,{cookie});assert.equal(items.filter(e=>e.stage==='GENERATE'&&e.kind==='STARTED').length,1);if(job.attempt===2)assert.ok(items.some(e=>e.kind==='RESUMED'&&e.stage==='GENERATE'));await request(`/api/jobs/${job.id}/result`,{cookie});}
 await request('/api/session',{cookie,method:'DELETE'});await unlink(file);console.log(JSON.stringify({status:'passed',fast,slow,attempts:[1,2],generationStartsPerJob:1}));
}
