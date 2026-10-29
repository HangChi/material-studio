// Run inside the frontend container of the dedicated 010 project.
// Required backend settings: queue=1, global pending=8, per-user pending=6, rate=10/minute.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
async function request(path,{cookie,method='GET',body,key}={}){
 const headers=new Headers();if(cookie)headers.set('cookie',cookie);if(method!=='GET')headers.set('origin',base);if(key)headers.set('Idempotency-Key',key);
 if(body&&!(body instanceof FormData)){headers.set('content-type','application/json');body=JSON.stringify(body);}
 return fetch(base+path,{method,headers,body});
}
async function json(path,options,status=200){const response=await request(path,options);assert.equal(response.status,status,await response.clone().text());return response.json();}
async function visitor(){const response=await request('/api/session',{method:'POST'});assert.equal(response.status,200);return response.headers.getSetCookie()[0].split(';')[0];}
async function upload(cookie){const bytes=await(await request('/api/demo/portrait.png')).arrayBuffer();const body=new FormData();body.append('file',new Blob([bytes],{type:'image/png'}),'demo.png');return(await json('/api/assets',{method:'POST',cookie,body},201)).id;}
const owner=await visitor(),stranger=await visitor(),jobs=[];
async function wait(cookie,id){
 for(let n=0;n<600;n++){const {job}=await json(`/api/jobs/${id}`,{cookie});if(['SUCCEEDED','FAILED'].includes(job.status))return job;await new Promise(r=>setTimeout(r,50));}
 throw Error('Task did not complete');
}
try{
 const templates=await json('/api/templates');assert.equal(templates.items.length,3);
 for(const path of ['/api/actuator/studio','/api/studio'])assert.equal((await request(path,{cookie:owner})).status,404);
 const asset=await upload(owner),other=await upload(stranger);
 const body={templateId:'demo-portrait',assetIds:[asset],simulation:{stageDurationsMs:{ASSET_CHECK:2000,GENERATE:0,FINALIZE:0}}};
 for(let n=0;n<6;n++){const {job}=await json('/api/jobs',{cookie:owner,method:'POST',body,key:`010-${n}`},202);assert.ok(['QUEUED','RUNNING'].includes(job.status));jobs.push({cookie:owner,id:job.id});}
 let refused=await request('/api/jobs',{cookie:owner,method:'POST',body,key:'010-personal-overflow'});assert.equal(refused.status,429);assert.equal(refused.headers.get('retry-after'),'60');assert.equal((await refused.json()).error.code,'ADMISSION_LIMIT');
 const replay=(await json('/api/jobs',{cookie:owner,method:'POST',body,key:'010-0'},202)).job;assert.equal(replay.id,jobs[0].id);
 for(let n=0;n<2;n++){const {job}=await json('/api/jobs',{cookie:stranger,method:'POST',body:{...body,assetIds:[other]},key:`010-other-${n}`},202);jobs.push({cookie:stranger,id:job.id});}
 refused=await request('/api/jobs',{cookie:stranger,method:'POST',body:{...body,assetIds:[other]}});assert.equal(refused.status,429);assert.equal((await refused.json()).error.code,'ADMISSION_LIMIT');
 for(const {cookie,id} of jobs){const job=await wait(cookie,id);assert.equal(job.status,'SUCCEEDED');assert.equal(job.attempt,1);assert.equal((await json(`/api/jobs/${id}/events`,{cookie})).items.length,6);assert.equal((await request(`/api/jobs/${id}/result`,{cookie})).status,200);}
 assert.equal((await request(`/api/jobs/${jobs[0].id}`,{cookie:stranger})).status,404);
 for(let n=0;n<4;n++){const {job}=await json('/api/jobs',{cookie:owner,method:'POST',body:{...body,simulation:{stageDurationsMs:{ASSET_CHECK:0,GENERATE:0,FINALIZE:0}}}},202);assert.equal((await wait(owner,job.id)).status,'SUCCEEDED');}
 refused=await request('/api/jobs',{cookie:owner,method:'POST',body});assert.equal(refused.status,429);assert.equal((await refused.json()).error.code,'RATE_LIMITED');
 const history=await json('/api/jobs?limit=50',{cookie:owner});assert.equal(history.items.length,10);
 console.log(JSON.stringify({status:'passed',checks:'catalog/proxy-monitoring-isolation/memory-overflow/person-quota/global-quota/idempotency/eight-once-only-successes/rate-limit/privacy',ownerJobs:10,otherJobs:2}));
}finally{
 for(const {cookie,id} of jobs){const response=await request(`/api/jobs/${id}`,{cookie});if(response.ok){const {job}=await response.json();if(['QUEUED','RUNNING'].includes(job.status))await request(`/api/jobs/${id}/cancel`,{cookie,method:'POST'});}}
 await request('/api/session',{cookie:owner,method:'DELETE'});await request('/api/session',{cookie:stranger,method:'DELETE'});
}
