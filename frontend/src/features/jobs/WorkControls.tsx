"use client";
import { TagEditor } from "./TagEditor";
import { StudioIcon } from "../../components/StudioIcon";
import { useEffect,useRef,useState } from "react";
import type { Job } from "./types";
import { isJob } from "./JobTracker";
export function WorkControls({job,onUpdate,onExpire}:{job:Job;onUpdate:(job:Job)=>void;onExpire:()=>void}){
 const [open,setOpen]=useState(false);
 const [name,setName]=useState(job.displayName??job.templateTitle),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const life=useRef({active:true,controller:null as AbortController|null});useEffect(()=>{const state=life.current;state.active=true;return()=>{state.active=false;state.controller?.abort();};},[]);
 async function update(changes:Record<string,unknown>){const state=life.current;if(state.controller)return;const controller=new AbortController();state.controller=controller;setBusy(true);setError("");
  try{const response=await fetch(`/api/jobs/${job.id}/library`,{method:"PATCH",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(changes),signal:controller.signal});if(!state.active)return;if(response.status===401){onExpire();return;}const payload=await response.json();if(!state.active)return;if(!response.ok||!isJob(payload.job))throw new Error(payload.error?.message??"作品更新失败，请重试");onUpdate(payload.job);}catch(error){if(state.active)setError(error instanceof Error?error.message:"作品更新失败，请重试");}finally{state.controller=null;if(state.active)setBusy(false);}
 }
 return <details className="work-controls" onToggle={e=>setOpen(e.currentTarget.open)}><summary><StudioIcon name="sliders" />管理作品<span className="disclosure-chevron" aria-hidden="true" /></summary><div className="work-panel"><div className="work-fields"><form onSubmit={event=>{event.preventDefault();void update({displayName:name});}}><label>作品名称<input aria-label={`作品名称 ${job.id}`} value={name} disabled={busy} maxLength={120} onChange={event=>setName(event.target.value)}/></label><button type="submit" disabled={busy} aria-label={`保存名称 ${job.id}`}>保存名称</button></form>{open&&<TagEditor id={job.id} onUpdate={onUpdate} onExpire={onExpire}/>}</div><div className="job-actions work-shortcuts"><button type="button" disabled={busy} aria-label={`${job.favorite?"取消收藏":"收藏作品"} ${job.id}`} onClick={()=>void update({favorite:!job.favorite})}><StudioIcon name="star"/>{job.favorite?"取消收藏":"收藏"}</button><button type="button" disabled={busy} aria-label={`${job.hidden?"恢复作品":"隐藏作品"} ${job.id}`} onClick={()=>void update({hidden:!job.hidden})}><StudioIcon name="hide"/>{job.hidden?"恢复作品":"隐藏作品"}</button></div> {error&&<p role="alert">{error}</p>}</div></details>;
}
