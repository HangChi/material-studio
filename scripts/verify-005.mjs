// Execute only in frontend container via Compose.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
async function request(path,method='GET',cookie,body){
 const headers=new Headers();if(cookie)headers.set('cookie',cookie);if(method!=='GET')headers.set('origin',base);
 if(body&&!(body instanceof FormData)){headers.set('content-type','application/json');body=JSON.stringify(body);}
 return fetch(base+path,{method,headers,body});
}
async function json(path,method,cookie,body,status=200){const response=await request(path,method,cookie,body);assert.equal(response.status,status,await response.clone().text());return response.json();}
async function visitor(cookie){const response=await request('/api/session','POST',cookie);assert.equal(response.status,200);return {cookie:response.headers.getSetCookie()[0].split(';')[0],id:(await response.json()).user.id};}
const owner=await visitor(),stranger=await visitor();let replacement;
try{
 const png=await(await request('/api/demo/portrait.png')).arrayBuffer(),form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'portrait.png');
 const asset=await json('/api/assets','POST',owner.cookie,form,201);
 const delays=(a,g=0,f=0)=>({ASSET_CHECK:a,GENERATE:g,FINALIZE:f});
 // Current admission defaults allow 10 creations/minute; this 24-record fixture respects backoff.
 async function submit(simulation){
  for(let attempt=0;attempt<4;attempt++){
   const response=await request('/api/jobs','POST',owner.cookie,{templateId:'demo-portrait',assetIds:[asset.id],simulation});
   if(response.status===429){const payload=await response.json();assert.equal(payload.error.code,'RATE_LIMITED');const seconds=Number(response.headers.get('retry-after')??60);assert.ok(seconds>0&&seconds<=60);await new Promise(r=>setTimeout(r,seconds*1000));continue;}
   assert.equal(response.status,202,await response.clone().text());return(await response.json()).job;
  }
  throw new Error('Admission remained throttled after three backoff windows');
 }
 const older=[];
 for(let n=0;n<21;n++){older.push(await submit({failStage:'ASSET_CHECK',stageDurationsMs:delays(0)}));if(n%3===0)await new Promise(r=>setTimeout(r,60));}
 await new Promise(r=>setTimeout(r,300));
 const a=await submit({stageDurationsMs:delays(800)}),b=await submit({failStage:'GENERATE',stageDurationsMs:delays(100,100)}),c=await submit({stageDurationsMs:delays(0)});
 const active=await json('/api/jobs/active','GET',owner.cookie);assert.ok([a,b,c].every(job=>active.items.some(item=>item.id===job.id)));
 assert.deepEqual((await json('/api/jobs/active','GET',stranger.cookie)).items,[]);
 await new Promise(r=>setTimeout(r,3000));
 const records=[];let cursor=null,pages=0;
 do{const page=await json('/api/jobs?limit=7'+(cursor?'&cursor='+cursor:''),'GET',owner.cookie);records.push(...page.items);cursor=page.nextCursor;assert.ok(++pages<8);}while(cursor);
 assert.equal(records.length,24);assert.equal(new Set(records.map(job=>job.id)).size,24);
 assert.equal(records.find(job=>job.id===a.id).status,'SUCCEEDED');assert.equal(records.find(job=>job.id===b.id).errorCode,'SIMULATED_FAILURE');assert.equal(records.find(job=>job.id===c.id).status,'SUCCEEDED');
 assert.deepEqual((await json('/api/jobs/active','GET',owner.cookie)).items,[]);
 assert.equal((await request('/api/jobs/'+a.id+'/result','GET',owner.cookie)).status,200);
 assert.equal((await request('/api/jobs/'+a.id+'/result','GET',stranger.cookie)).status,404);
 assert.equal((await json('/api/jobs','GET',owner.cookie)).items.length,20);
 assert.equal((await request('/api/jobs?cursor='+a.id,'GET',stranger.cookie)).status,400);
 await request('/api/session','DELETE',owner.cookie);assert.equal((await request('/api/jobs','GET',owner.cookie)).status,401);
 replacement=await visitor(owner.cookie);assert.notEqual(replacement.id,owner.id);assert.deepEqual((await json('/api/jobs','GET',replacement.cookie)).items,[]);
 assert.equal((await request('/api/jobs/'+a.id,'GET',replacement.cookie)).status,404);
 console.log('PASS: 24 real records across four pages, active three-task isolation, independent success/failure, private result, refresh recovery and revoked/new visitor separation');
}finally{
 await request('/api/session','DELETE',owner.cookie);await request('/api/session','DELETE',stranger.cookie);if(replacement)await request('/api/session','DELETE',replacement.cookie);
}
