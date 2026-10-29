import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
const base="http://127.0.0.1:3000";
let cookie="";
async function request(path,{method="GET",body,key,identity=cookie}={}) {
 const headers={};if(identity)headers.cookie=identity;if(key)headers["Idempotency-Key"]=key;
 if(body&&!(body instanceof FormData))headers["content-type"]="application/json";
 return fetch(base+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
}
async function session(){const response=await request("/api/session",{method:"POST",identity:""});assert.equal(response.status,200);return response.headers.get("set-cookie").split(";")[0];}
async function json(path,options){const response=await request(path,options);assert.ok(response.ok,`${path}: ${response.status}`);return response.json();}
async function wait(id){for(let attempt=0;attempt<200;attempt++){const {job}=await json(`/api/jobs/${id}`);if(["FAILED","SUCCEEDED"].includes(job.status))return job;await new Promise(resolve=>setTimeout(resolve,50));}throw Error("Task did not finish");}
try {
 cookie=await session();const assets=[];
 for(const name of ["portrait","collage"]){const image=await request(`/api/demo/${name}.png`);assert.ok(image.ok);const form=new FormData();form.append("file",new Blob([await image.arrayBuffer()],{type:"image/png"}),`${name}.png`);assets.push((await json("/api/assets",{method:"POST",body:form})).id);}
 const parameters={title:"旅途里的两段故事",palette:"OCEAN",format:"SQUARE",crops:[{x:0.2,y:0.7,zoom:1.5},{x:0.6,y:0.4,zoom:1.2}]};
 const body={templateId:"demo-postcard",assetIds:assets,parameters,simulation:{stageDurationsMs:{ASSET_CHECK:0,GENERATE:0,FINALIZE:0}}};const key=randomUUID();
 const submissions=await Promise.all([json("/api/jobs",{method:"POST",body,key}),json("/api/jobs",{method:"POST",body,key})]);
 const id=submissions[0].job.id;assert.equal(submissions[1].job.id,id);
 assert.equal((await request("/api/jobs",{method:"POST",body:{...body,parameters:{...parameters,title:"changed"}},key})).status,409);
 const job=await wait(id);assert.equal(job.status,"SUCCEEDED");
 assert.equal((await json(`/api/jobs/${id}/events`)).items.length,6);
 const preview=Buffer.from(await (await request(`/api/jobs/${id}/result`)).arrayBuffer());
 const download=await request(`/api/jobs/${id}/download`);assert.equal(download.status,200);assert.ok(download.headers.get("content-disposition").includes("attachment"));assert.deepEqual(Buffer.from(await download.arrayBuffer()),preview);
 assert.equal(preview.readUInt32BE(16),1000);assert.equal(preview.readUInt32BE(20),1000);
 const recipe=await json(`/api/jobs/${id}/recipe`);assert.deepEqual(recipe.parameters,parameters);assert.deepEqual(recipe.assetIds,assets);
 const remakeKey=randomUUID();const remake=(await json(`/api/jobs/${id}/recreate`,{method:"POST",key:remakeKey})).job;assert.notEqual(remake.id,id);
 assert.equal((await json(`/api/jobs/${id}/recreate`,{method:"POST",key:remakeKey})).job.id,remake.id);assert.equal((await wait(remake.id)).status,"SUCCEEDED");assert.equal((await json(`/api/jobs/${remake.id}/recipe`)).sourceJobId,id);
 const failed=(await json("/api/jobs",{method:"POST",key:randomUUID(),body:{...body,simulation:{...body.simulation,failStage:"GENERATE"}}})).job;assert.equal((await wait(failed.id)).status,"FAILED");
 const retry=(await json(`/api/jobs/${failed.id}/recreate`,{method:"POST",key:randomUUID()})).job;assert.equal((await wait(retry.id)).status,"SUCCEEDED");assert.equal((await wait(failed.id)).status,"FAILED");
 const stranger=await session();try{for(const suffix of ["recipe","download","events"]){assert.equal((await request(`/api/jobs/${id}/${suffix}`,{identity:stranger})).status,404);}assert.equal((await request(`/api/jobs/${id}/recreate`,{method:"POST",key:randomUUID(),identity:stranger})).status,404);}finally{await request("/api/session",{method:"DELETE",identity:stranger});}
 console.log(JSON.stringify({checks:"idempotent-concurrency/conflict/render/recipe/events/download/remake/failed-retry/privacy",jobId:id,dimensions:"1000x1000",resultSha256:createHash("sha256").update(preview).digest("hex"),status:"passed"}));
}finally{if(cookie)await request("/api/session",{method:"DELETE"});}
