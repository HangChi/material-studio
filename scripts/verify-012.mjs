// Run only in a disposable material-studio-012 frontend container.
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
if(process.env.VERIFY_ISOLATED!=='true')throw Error('Use VERIFY_ISOLATED=true only in a dedicated test project');
const base='http://127.0.0.1:3000',file='/tmp/material-012-fixture.json';
async function request(path,{cookie,method='GET',body}={}){const headers=new Headers();if(cookie)headers.set('cookie',cookie);if(method!=='GET')headers.set('origin',base);if(body&&!(body instanceof FormData)){headers.set('content-type','application/json');body=JSON.stringify(body);}const r=await fetch(base+path,{method,headers,body});assert.ok(r.ok,`${path}: ${r.status}`);return r;}
async function json(path,options){return(await request(path,options)).json();}
if(process.env.VERIFY_MODE==='prepare'){
 const session=await request('/api/session',{method:'POST'}),cookie=session.headers.getSetCookie()[0].split(';')[0];
 const bytes=await(await request('/api/demo/portrait.png')).arrayBuffer(),body=new FormData();body.append('file',new Blob([bytes],{type:'image/png'}),'fixture.png');const asset=await json('/api/assets',{cookie,method:'POST',body});
 const {job}=await json('/api/jobs',{cookie,method:'POST',body:{templateId:'demo-portrait',assetIds:[asset.id],simulation:{stageDurationsMs:{ASSET_CHECK:0,GENERATE:0,FINALIZE:10000}}}});
 for(let i=0;i<300;i++){const {items}=await json(`/api/jobs/${job.id}/events`,{cookie});if(items.some(e=>e.stage==='FINALIZE'&&e.kind==='STARTED')){await writeFile(file,JSON.stringify({cookie,id:job.id}),{mode:0o600});console.log(JSON.stringify({status:'ready-for-SIGKILL',id:job.id}));process.exit(0);}await new Promise(r=>setTimeout(r,50));}throw Error('Did not reach finalization');
}else{
 const {cookie,id}=JSON.parse(await readFile(file,'utf8'));let job;
 for(let i=0;i<600;i++){({job}=await json('/api/jobs/'+id,{cookie}));if(['SUCCEEDED','FAILED'].includes(job.status))break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(job.status,'SUCCEEDED');assert.equal(job.attempt,2);const {items}=await json(`/api/jobs/${id}/events`,{cookie});assert.equal(items.filter(e=>e.stage==='GENERATE'&&e.kind==='STARTED').length,1);assert.ok(items.some(e=>e.stage==='GENERATE'&&e.kind==='RESUMED'));await request(`/api/jobs/${id}/result`,{cookie});await request('/api/session',{cookie,method:'DELETE'});await unlink(file);console.log(JSON.stringify({status:'passed',id,attempt:job.attempt,generationExecutions:1,events:items.length}));
}
