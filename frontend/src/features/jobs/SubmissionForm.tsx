"use client";

import { SessionGate } from "../identity/SessionGate";
import { JobCards } from "./JobCards";
import { isJob } from "./JobTracker";
import { useJobTracker } from "./useJobTracker";
import { useEffect, useId, useRef, useState } from "react";
import type { Template } from "../templates/types";
import { UploadSlots } from "../assets/UploadSlots";


export function SubmissionForm({template}:{template:Template}){return <SessionGate>{owner=><SubmissionBody key={owner} template={template} owner={owner}/>}</SessionGate>;}
function SubmissionBody({template,owner}:{template:Template;owner:string}) {
 const heading=useId();
 const {tracker,snapshot}=useJobTracker(owner);
 const jobs=snapshot.jobs;
 const [assets,setAssets]=useState<(string|null)[]>([]);
 const [resetKey,setResetKey]=useState(0);
 const storageKey=`material-pending:${owner}:${template.id}`;
 const [pending,setPending]=useState<{key:string;body:string}|null>(()=>{
  try{const value=JSON.parse(sessionStorage.getItem(storageKey)??"null");return value&&typeof value.key==="string"&&typeof value.body==="string"?value:null;}catch{return null;}
 });
 const [storageWarning,setStorageWarning]=useState("");
 function remember(value:{key:string;body:string}|null){setPending(value);try{if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey);}catch{setStorageWarning("浏览器存储不可用，请保留此页面以便安全重试提交。");}}
 const [mode,setMode]=useState<"idle"|"submitting"|"error"|"unknown">(pending?"unknown":"idle");
 const [error,setError]=useState("");
 const [checking,setChecking]=useState(false);
 const [reviewed,setReviewed]=useState(false);
 const [queryError,setQueryError]=useState("");
 const [loaded,setLoaded]=useState(false);
 const locked=useRef(!!pending);
 const resources=useRef({active:true,controllers:new Set<AbortController>()});
 useEffect(()=>{
  const state=resources.current;state.active=true;
  return()=>{state.active=false;state.controllers.forEach(controller=>controller.abort());};
 },[]);
 const ready=assets.length===template.requiredImageCount&&assets.every(id=>typeof id==="string"&&id.length>0);
 async function submit(retry=false){
  if(retry?(mode!=="unknown"||!pending):(locked.current||!ready))return;
  const operation=retry?pending!:{key:crypto.randomUUID(),body:JSON.stringify({templateId:template.id,assetIds:assets})};
  remember(operation);
  locked.current=true;setMode("submitting");setError("");
  const state=resources.current,controller=new AbortController();state.controllers.add(controller);
  try{
   const response=await fetch("/api/jobs",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json","Idempotency-Key":operation.key},body:operation.body,signal:controller.signal});
   if(response.status===401){tracker.expire();return;}
   const result=await response.json();if(!state.active)return;
   if(response.status>=400&&response.status<500){remember(null);setMode("error");setError(result.error?.message??"提交参数不正确，请检查素材");locked.current=false;return;}
   if(response.status!==202||!isJob(result.job))throw new Error("提交结果无效");
   remember(null);tracker.seed([result.job]);
   setAssets([]);setResetKey(key=>key+1);setMode("idle");locked.current=false;
  }catch{if(state.active){setMode("unknown");setReviewed(false);setError("提交结果尚未确认，请先查看已受理任务核对，确认前不要重复提交。");}}
  finally{state.controllers.delete(controller);}
 }
 async function reconcile(){
  if(checking||mode==="submitting")return;
  setChecking(true);setReviewed(false);setQueryError("");
  const state=resources.current,controller=new AbortController();state.controllers.add(controller);
  try{
   const response=await fetch("/api/jobs",{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   if(response.status===401){tracker.expire();return;}
   const payload=await response.json();
   if(!response.ok||!Array.isArray(payload.items)||!payload.items.every(isJob))throw new Error("无法读取记录");
   if(state.active){tracker.seed(payload.items);setReviewed(true);setLoaded(true);}
  }catch{if(state.active)setQueryError("核对失败，请稍后重新查看；确认前不要重复提交。");}
  finally{state.controllers.delete(controller);if(state.active)setChecking(false);}
 }
 function confirmReview(){
  if(!reviewed||mode!=="unknown")return;
  remember(null);locked.current=false;setMode("idle");setError("");setAssets([]);setResetKey(key=>key+1);setReviewed(false);
 }
 if(snapshot.authExpired)return <p role="alert">访客身份已失效，请刷新页面重新建立。</p>;
 return <section className="submission-panel" aria-labelledby={heading}>
  <h2 id={heading}>上传素材</h2><p className="form-help">准备 {template.requiredImageCount} 张图片，支持JPEG、PNG，每张最多5 MiB、2000万像素。</p>
  <form onSubmit={event=>{event.preventDefault();void submit();}}>
   <UploadSlots key={resetKey} template={template} onChange={setAssets} disabled={mode==="submitting"||mode==="unknown"}/>
   {storageWarning&&<p role="status">{storageWarning}</p>}
   {mode==="unknown"&&pending&&<button type="button" onClick={()=>void submit(true)}>安全重试本次提交</button>}
   {error&&<p role="alert">{error}</p>}
   <button className="primary submit-button" type="submit" disabled={!ready||mode==="submitting"||mode==="unknown"}>{mode==="submitting"?"提交中…":"提交制作"}</button>
  </form>
  <div className="reconcile-actions"><button type="button" disabled={mode==="submitting"||checking} onClick={()=>void reconcile()}>{checking?"正在核对…":"查看已受理任务"}</button>
   {mode==="unknown"&&reviewed&&<button type="button" onClick={confirmReview}>已核对，继续准备</button>}
  </div>
  {queryError&&<p role="alert">{queryError}</p>}
  {loaded&&jobs.length===0&&<p>当前访客暂时没有已受理任务。</p>}
  {jobs.length>0&&<section aria-label="已受理任务" className="job-receipts"><h3>已受理任务</h3><JobCards jobs={jobs} errors={snapshot.errors} onRetry={id=>tracker.retry(id)} headingLevel={4}/></section>}
 </section>;
}
