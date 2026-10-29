"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Template } from "../templates/types";
import { UploadSlots } from "../assets/UploadSlots";
import type { Job } from "./types";

export function SubmissionForm({ template }: { template: Template }) {
 const heading=useId();
 const [identity,setIdentity]=useState<"loading"|"ready"|"error">("loading");
 const [identityAttempt,setIdentityAttempt]=useState(0);
 const [assets,setAssets]=useState<(string|null)[]>([]);
 const [resetKey,setResetKey]=useState(0);
 const [mode,setMode]=useState<"idle"|"submitting"|"error"|"unknown">("idle");
 const [error,setError]=useState("");
 const [jobs,setJobs]=useState<Job[]>([]);
 const [checking,setChecking]=useState(false);
 const [reviewed,setReviewed]=useState(false);
 const [queryError,setQueryError]=useState("");
 const [loaded,setLoaded]=useState(false);
 const locked=useRef(false);
 const resources=useRef({active:true,controllers:new Set<AbortController>()});
 useEffect(()=>{
  const state=resources.current;state.active=true;
  return()=>{state.active=false;state.controllers.forEach(controller=>controller.abort());};
 },[]);
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  fetch("/api/session",{method:"POST",credentials:"same-origin",signal:controller.signal}).then(async response=>{
   const payload=await response.json();if(!response.ok||typeof payload.user?.id!=="string")throw new Error("身份初始化失败");
   if(active)setIdentity("ready");
  }).catch(()=>{if(active)setIdentity("error");});
  return()=>{active=false;controller.abort();};
 },[identityAttempt]);
 const ready=assets.length===template.requiredImageCount&&assets.every(id=>typeof id==="string"&&id.length>0);
 async function submit(){
  if(locked.current||identity!=="ready"||!ready)return;
  locked.current=true;setMode("submitting");setError("");
  const state=resources.current,controller=new AbortController();state.controllers.add(controller);
  try{
   const response=await fetch("/api/jobs",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({templateId:template.id,assetIds:assets}),signal:controller.signal});
   const result=await response.json();if(!state.active)return;
   if(response.status>=400&&response.status<500){setMode("error");setError(result.error?.message??"提交参数不正确，请检查素材");locked.current=false;return;}
   if(response.status!==202||!isJob(result.job))throw new Error("提交结果无效");
   setJobs(previous=>[result.job,...previous.filter(item=>item.id!==result.job.id)].slice(0,50));
   setAssets([]);setResetKey(key=>key+1);setMode("idle");locked.current=false;
  }catch{if(state.active){setMode("unknown");setReviewed(false);setError("提交结果尚未确认，请先查看已受理任务核对，确认前不要重复提交。");}}
  finally{state.controllers.delete(controller);}
 }
 async function reconcile(){
  if(identity!=="ready"||checking||mode==="submitting")return;
  setChecking(true);setReviewed(false);setQueryError("");
  const state=resources.current,controller=new AbortController();state.controllers.add(controller);
  try{
   const response=await fetch("/api/jobs",{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   const payload=await response.json();
   if(!response.ok||!Array.isArray(payload.items)||!payload.items.every(isJob))throw new Error("无法读取记录");
   if(state.active){setJobs(payload.items.slice(0,50));setReviewed(true);setLoaded(true);}
  }catch{if(state.active)setQueryError("核对失败，请稍后重新查看；确认前不要重复提交。");}
  finally{state.controllers.delete(controller);if(state.active)setChecking(false);}
 }
 function confirmReview(){
  if(!reviewed||mode!=="unknown")return;
  locked.current=false;setMode("idle");setError("");setAssets([]);setResetKey(key=>key+1);setReviewed(false);
 }
 return <section className="submission-panel" aria-labelledby={heading}>
  <h2 id={heading}>上传素材</h2><p className="form-help">准备 {template.requiredImageCount} 张图片，支持JPEG、PNG，每张最多5 MiB、2000万像素。</p>
  {identity==="loading"&&<p role="status">正在建立访客身份…</p>}
  {identity==="error"&&<div><p role="alert">暂时无法建立访客身份，请重试。</p><button type="button" onClick={()=>{setIdentity("loading");setIdentityAttempt(value=>value+1);}}>重新建立访客身份</button></div>}
  <form onSubmit={event=>{event.preventDefault();void submit();}}>
   <UploadSlots key={resetKey} template={template} onChange={setAssets} disabled={identity!=="ready"||mode==="submitting"||mode==="unknown"}/>
   {error&&<p role="alert">{error}</p>}
   <button className="primary submit-button" type="submit" disabled={identity!=="ready"||!ready||mode==="submitting"||mode==="unknown"}>{mode==="submitting"?"提交中…":"提交制作"}</button>
  </form>
  <div className="reconcile-actions"><button type="button" disabled={identity!=="ready"||mode==="submitting"||checking} onClick={()=>void reconcile()}>{checking?"正在核对…":"查看已受理任务"}</button>
   {mode==="unknown"&&reviewed&&<button type="button" onClick={confirmReview}>已核对，继续准备</button>}
  </div>
  {queryError&&<p role="alert">{queryError}</p>}
  {loaded&&jobs.length===0&&<p>当前访客暂时没有已受理任务。</p>}
  {jobs.length>0&&<section aria-label="已受理任务" className="job-receipts" aria-live="polite"><h3>已受理任务</h3>{jobs.map(job=><article className="job-receipt" key={job.id}>
   <h4>{job.templateTitle}</h4><p className="task-number">任务编号：{job.id}</p>
   <p>{({QUEUED:"等待处理",RUNNING:"处理中",SUCCEEDED:"制作成功",FAILED:"制作失败"})[job.status]}</p>
   <p className="receipt-time"><time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString("zh-CN")}</time></p>
   {job.errorMessage&&<p>{job.errorMessage}</p>}
  </article>)}</section>}
 </section>;
}

function isJob(value:unknown):value is Job {
 if(typeof value!=="object"||value===null)return false;
 const job=value as Record<string,unknown>;
 return typeof job.id==="string"&&typeof job.templateTitle==="string"&&typeof job.createdAt==="string"&&["QUEUED","RUNNING","SUCCEEDED","FAILED"].includes(String(job.status));
}
