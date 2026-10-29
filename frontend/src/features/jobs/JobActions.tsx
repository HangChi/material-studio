"use client";
import { useEffect, useRef, useState } from "react";
import type { Job } from "./types";
import { isJob } from "./JobTracker";
import { DownloadResult } from "./DownloadResult";
export function JobActions({job,onAccepted,onExpire}:{job:Job;onAccepted:(job:Job)=>void;onExpire:()=>void}){
 const storageKey=`material-recreate:${job.id}`;
 const [pending,setPending]=useState<string|null>(()=>{try{return sessionStorage.getItem(storageKey);}catch{return null;}});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const resources=useRef({active:true,controller:null as AbortController|null});
 useEffect(()=>{const state=resources.current;state.active=true;return()=>{state.active=false;state.controller?.abort();};},[]);
 function remember(key:string|null){setPending(key);try{if(key)sessionStorage.setItem(storageKey,key);else sessionStorage.removeItem(storageKey);}catch{/* Current page still retains the key. */}}
 async function recreate(){
  const state=resources.current;if(state.controller)return;
  const key=pending??crypto.randomUUID();remember(key);
  const controller=new AbortController();state.controller=controller;setBusy(true);setError("");
  try{
   const response=await fetch(`/api/jobs/${job.id}/recreate`,{method:"POST",credentials:"same-origin",headers:{"Idempotency-Key":key},signal:controller.signal});
   if(!state.active)return;
   if(response.status===401){onExpire();return;}
   const payload=await response.json();if(!state.active)return;
   if(response.status>=400&&response.status<500){remember(null);setError(payload.error?.message??"重新制作失败，请检查素材");return;}
   if(response.status!==202||!isJob(payload.job))throw new Error("Invalid admission");
   remember(null);onAccepted(payload.job);
  }catch{if(state.active)setError("重新制作结果尚未确认，可安全重试本次操作。");}
  finally{state.controller=null;if(state.active)setBusy(false);}
 }
 if(job.status!=="FAILED"&&job.status!=="SUCCEEDED")return null;
 const label=pending?"安全重试重新制作":job.status==="FAILED"?"重试失败任务":"再次制作";
 return <div className="job-actions">
  <div><button type="button" aria-label={`${label} ${job.id}`} disabled={busy} onClick={()=>void recreate()}>{busy?"正在受理…":label}</button>
   {pending&&!busy&&!error&&<p role="status">有一次重新制作尚未确认，可安全重试。</p>}{error&&<p role="alert">{error}</p>}
  </div>
  {job.status==="SUCCEEDED"&&<DownloadResult id={job.id} onExpire={onExpire}/>}
 </div>;
}
