// docker compose exec -T frontend node --input-type=module < scripts/measure-admission.mjs
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
async function request(path,method='GET',cookie,body){
 const headers=new Headers();if(cookie)headers.set('cookie',cookie);if(method!=='GET')headers.set('origin',base);
 if(body&&!(body instanceof FormData)){headers.set('content-type','application/json');body=JSON.stringify(body);}
 return fetch(base+path,{method,headers,body});
}
const session=await request('/api/session','POST');assert.equal(session.status,200);
const cookie=session.headers.getSetCookie()[0].split(';')[0];const samples=[];
try{
 const png=await(await request('/api/demo/portrait.png')).arrayBuffer(),form=new FormData();form.append('file',new Blob([png],{type:'image/png'}),'portrait.png');
 const upload=await request('/api/assets','POST',cookie,form);assert.equal(upload.status,201);const asset=await upload.json();
 await request('/api/templates/demo-portrait');
 console.log(JSON.stringify({kind:'conditions',measuredAt:new Date().toISOString(),samples:10,limitMs:2000,defaultStageMs:2000,scope:'frontend container -> Next same-origin proxy -> Java/MySQL; setup excluded; sequential, wait for terminal between samples'}));
 for(let index=1;index<=10;index++){
  const started=performance.now();const response=await request('/api/jobs','POST',cookie,{templateId:'demo-portrait',assetIds:[asset.id]});const payload=await response.json();const elapsedMs=Number((performance.now()-started).toFixed(3));
  assert.equal(response.status,202);assert.ok(payload.job.id);assert.ok(['QUEUED','RUNNING'].includes(payload.job.status));
  const deadline=performance.now()+15000;let job;
  do{
   await new Promise(resolve=>setTimeout(resolve,200));const read=await request('/api/jobs/'+payload.job.id,'GET',cookie);assert.equal(read.status,200);job=(await read.json()).job;
   if(['SUCCEEDED','FAILED'].includes(job.status))break;
  }while(performance.now()<deadline);
  assert.equal(job.status,'SUCCEEDED');
  const processingMs=Date.parse(job.finishedAt)-Date.parse(job.createdAt);assert.ok(processingMs>=6000,'default processing must take at least six seconds');
  const eventsResponse=await request('/api/jobs/'+job.id+'/events','GET',cookie);assert.equal(eventsResponse.status,200);const events=(await eventsResponse.json()).items;
  assert.equal(events.length,6);const stageMs=[0,2,4].map(n=>Date.parse(events[n+1].createdAt)-Date.parse(events[n].createdAt));
  assert.ok(stageMs.every(ms=>ms>=2000));
  const sample={index,jobId:job.id,elapsedMs,httpStatus:response.status,processingMs,stageMs,pass:elapsedMs<2000};samples.push(sample);console.log(JSON.stringify(sample));
 }
 console.log(JSON.stringify({kind:'summary',count:samples.length,allPassed:samples.every(sample=>sample.pass),minMs:Math.min(...samples.map(sample=>sample.elapsedMs)),maxMs:Math.max(...samples.map(sample=>sample.elapsedMs)),meanMs:Number((samples.reduce((total,sample)=>total+sample.elapsedMs,0)/samples.length).toFixed(3))}));
 assert.equal(samples.length,10);assert.ok(samples.every(sample=>sample.pass),'all ten API samples must meet the two-second target');
}finally{await request('/api/session','DELETE',cookie);}
