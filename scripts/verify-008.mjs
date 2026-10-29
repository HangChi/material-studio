import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile,writeFile,unlink } from "node:fs/promises";
const base="http://127.0.0.1:3000",mode=process.env.VERIFY_MODE??"all",statePath="/tmp/material-verify008-state.json";
let cookie="",preserve=false;
const fast={stageDurationsMs:{ASSET_CHECK:0,GENERATE:0,FINALIZE:0}};
async function request(path,{method="GET",body,key,identity=cookie}={}){const headers={};if(identity)headers.cookie=identity;if(key)headers["Idempotency-Key"]=key;if(body&&!(body instanceof FormData))headers["content-type"]="application/json";return fetch(base+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});}
async function json(path,options){const response=await request(path,options);assert.ok(response.ok,`${path}: ${response.status}`);return response.json();}
async function session(){const response=await request("/api/session",{method:"POST",identity:""});assert.equal(response.status,200);return response.headers.get("set-cookie").split(";")[0];}
async function wait(id,predicate=job=>["SUCCEEDED","FAILED"].includes(job.status)){for(let n=0;n<600;n++){const {job}=await json(`/api/jobs/${id}`);if(predicate(job))return job;await new Promise(resolve=>setTimeout(resolve,50));}throw Error("Timed out waiting for "+id);}
async function upload(){const ids=[];for(const name of ["portrait","postcard","collage"]){const image=await request(`/api/demo/${name}.png`);assert.ok(image.ok);const form=new FormData();form.append("file",new Blob([await image.arrayBuffer()],{type:"image/png"}),`${name}.png`);ids.push((await json("/api/assets",{method:"POST",body:form})).id);}return ids;}
async function create(templateId,assetIds,extra={}){return (await json("/api/jobs",{method:"POST",key:randomUUID(),body:{templateId,assetIds,simulation:fast,...extra}})).job;}
try{
 if(mode==="restart-check"){
  const saved=JSON.parse(await readFile(statePath,"utf8"));cookie=saved.cookie;
  const recovered=await wait(saved.running),queued=await wait(saved.queued);assert.equal(recovered.status,"SUCCEEDED");assert.equal(recovered.attempt,2);assert.equal(queued.status,"SUCCEEDED");assert.equal(queued.attempt,1);
  assert.ok((await json(`/api/jobs/${saved.running}/events`)).items.some(event=>event.kind==="INTERRUPTED"));await unlink(statePath);console.log(JSON.stringify({mode,status:"passed",sameJobId:saved.running,recoveredAttempt:recovered.attempt,queuedPreserved:true}));
 }else{
  cookie=await session();const assets=await upload();
  if(mode==="restart-prepare"){
   const running=await create("demo-portrait",[assets[0]],{simulation:{stageDurationsMs:{ASSET_CHECK:100,GENERATE:10000,FINALIZE:100}}});const queued=await create("demo-collage",assets);await wait(running.id,job=>job.status==="RUNNING"&&job.stage==="GENERATE");
   await writeFile(statePath,JSON.stringify({cookie,running:running.id,queued:queued.id}),{mode:0o600});preserve=true;console.log(JSON.stringify({mode,status:"ready",running:running.id,queued:queued.id}));
  }else{
   const first=await json("/api/assets?limit=2");assert.equal(first.items.length,2);const second=await json(`/api/assets?limit=2&cursor=${first.nextCursor}`);assert.equal(second.items.length,1);
   const portrait=await create("demo-portrait",[assets[0]]),postcard=await create("demo-postcard",assets.slice(0,2)),collage=await create("demo-collage",assets);
   for(const [job,width,height] of [[portrait,1000,1200],[postcard,1200,800],[collage,1200,900]]){assert.equal((await wait(job.id)).status,"SUCCEEDED");const response=await request(`/api/jobs/${job.id}/download`);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);}
   const parameters={title:"编辑后的新作品",palette:"OCEAN",format:"SQUARE",crops:[{x:0.2,y:0.5,zoom:1.5},{x:0.5,y:0.4,zoom:1.2}]};
   const edited=await create("demo-postcard",assets.slice(1),{sourceJobId:postcard.id,parameters});assert.equal((await wait(edited.id)).status,"SUCCEEDED");const recipe=await json(`/api/jobs/${edited.id}/recipe`);assert.equal(recipe.sourceJobId,postcard.id);assert.deepEqual(recipe.parameters,parameters);assert.deepEqual(recipe.assetIds,assets.slice(1));assert.equal((await json(`/api/jobs/${postcard.id}/recipe`)).parameters.title,"旅途来信");
   await json(`/api/jobs/${edited.id}/library`,{method:"PATCH",body:{displayName:"海边旅行",favorite:true}});assert.equal((await json("/api/jobs?q="+encodeURIComponent("海边")+"&favorite=true")).items.length,1);
   await json(`/api/jobs/${edited.id}/library`,{method:"PATCH",body:{hidden:true}});assert.ok(!(await json("/api/jobs")).items.some(job=>job.id===edited.id));assert.equal((await json("/api/jobs?hidden=true")).items.length,1);await json(`/api/jobs/${edited.id}/library`,{method:"PATCH",body:{hidden:false}});
   const running=await create("demo-portrait",[assets[0]],{simulation:{stageDurationsMs:{ASSET_CHECK:100,GENERATE:3000,FINALIZE:100}}});await wait(running.id,job=>job.stage==="GENERATE");const queued=await create("demo-collage",assets);assert.ok((await json(`/api/jobs/${queued.id}`)).job.queueAhead>=1);
   for(const id of [queued.id,running.id]){assert.equal((await json(`/api/jobs/${id}/cancel`,{method:"POST"})).job.errorCode,"JOB_CANCELLED");assert.equal((await json(`/api/jobs/${id}/cancel`,{method:"POST"})).job.errorCode,"JOB_CANCELLED");}
   assert.equal((await json("/api/jobs?status=CANCELLED")).items.length,2);assert.equal((await request(`/api/jobs/${running.id}/download`)).status,404);
   const stranger=await session();try{assert.equal((await request(`/api/jobs/${edited.id}/library`,{method:"PATCH",identity:stranger,body:{favorite:false}})).status,404);assert.equal((await request(`/api/jobs/${edited.id}/cancel`,{method:"POST",identity:stranger})).status,404);assert.equal((await json("/api/assets",{identity:stranger})).items.length,0);}finally{await request("/api/session",{method:"DELETE",identity:stranger});}
   console.log(JSON.stringify({mode,status:"passed",checks:"asset-pagination/three-real-templates/edited-recipe/rename/favorite/hide/restore/search/cancel/queue/privacy",editedJob:edited.id}));
  }
 }
}finally{if(cookie&&!preserve)await request("/api/session",{method:"DELETE"});}
