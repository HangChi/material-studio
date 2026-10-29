"use client";

import { draftKey,readDraft,saveDraft } from "./draft-storage";
import { PostcardEditor, defaultParameters } from "./PostcardEditor";
import { SessionGate } from "../identity/SessionGate";
import { JobCards } from "./JobCards";
import { isJob } from "./JobTracker";
import { useJobTracker } from "./useJobTracker";
import { useEffect, useId, useRef, useState } from "react";
import type { Template } from "../templates/types";
import { UploadSlots } from "../assets/UploadSlots";


export function SubmissionForm({template,sourceJobId}:{template:Template;sourceJobId?:string}){return <SessionGate>{owner=><SubmissionBody key={owner} template={template} owner={owner} sourceJobId={sourceJobId}/>}</SessionGate>;}
function SubmissionBody({template,owner,sourceJobId}:{template:Template;owner:string;sourceJobId?:string}) {
 const heading=useId();
 const {tracker,snapshot}=useJobTracker(owner);
 const jobs=snapshot.jobs;
 const localKey=draftKey(owner,template.id,sourceJobId);
 const [draftLoad]=useState(()=>readDraft(localKey,template.requiredImageCount));
 const [draftEnabled,setDraftEnabled]=useState(true),[draftMessage,setDraftMessage]=useState(draftLoad.error||(draftLoad.draft?"已恢复本地草稿":""));
 const [parameters,setParameters]=useState(()=>draftLoad.draft?.parameters??defaultParameters());
 const [assets,setAssets]=useState<(string|null)[]>(()=>draftLoad.draft?.assetIds??[]);
 function clearDraft(){try{localStorage.removeItem(localKey);return true;}catch{setDraftMessage("无法清除本地草稿，请检查浏览器存储设置。");return false;}}
 function discardDraft(){if(!clearDraft())return;setDraftEnabled(false);setAssets([]);setParameters(defaultParameters());setResetKey(value=>value+1);setDraftMessage("草稿已清空");}
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
 const [sourceState,setSourceState]=useState(sourceJobId?"loading":"ready"),[sourceAttempt,setSourceAttempt]=useState(0);
 useEffect(()=>{
  if(!sourceJobId)return;
  const state=resources.current,controller=new AbortController();state.controllers.add(controller);let active=true;
  void (async()=>{
   try{
    const response=await fetch(`/api/jobs/${encodeURIComponent(sourceJobId)}/recipe`,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
    if(response.status===401){if(active)tracker.expire();return;}
    const payload=await response.json();if(!active)return;
    if(!response.ok||!Array.isArray(payload.assetIds)||payload.assetIds.length!==template.requiredImageCount||!payload.assetIds.every((id:unknown)=>typeof id==="string"))throw new Error("Invalid recipe");
    if(!draftLoad.draft){setAssets(payload.assetIds);if(payload.parameters)setParameters(payload.parameters);}setResetKey(value=>value+1);setSourceState("ready");
   }catch{if(active)setSourceState("error");}
   finally{state.controllers.delete(controller);}
  })();
  return()=>{active=false;controller.abort();};
 },[sourceJobId,sourceAttempt,template.requiredImageCount,tracker,draftLoad.draft]);
 useEffect(()=>{
  if(!draftEnabled||sourceState!=="ready"||mode==="unknown"||mode==="submitting"||!assets.some(Boolean)&&JSON.stringify(parameters)===JSON.stringify(defaultParameters()))return;
  let active=true;void Promise.resolve().then(()=>{if(!active)return;try{saveDraft(localKey,assets,parameters,template.requiredImageCount);setDraftMessage("草稿已保存到此浏览器");}catch{setDraftMessage("草稿保存失败，请保留此页面并检查浏览器存储设置。");}});return()=>{active=false;};
 },[assets,parameters,draftEnabled,sourceState,mode,localKey,template.requiredImageCount]);
 const ready=assets.length===template.requiredImageCount&&assets.every(id=>typeof id==="string"&&id.length>0);
 async function submit(retry=false){
  if(retry?(mode!=="unknown"||!pending):(locked.current||!ready))return;
  const operation=retry?pending!:{key:crypto.randomUUID(),body:JSON.stringify({templateId:template.id,assetIds:assets,...(sourceJobId?{sourceJobId}:{}),...(template.id==="demo-postcard"?{parameters}:{})})};
  remember(operation);
  locked.current=true;setMode("submitting");setError("");
  const state=resources.current,controller=new AbortController();state.controllers.add(controller);
  try{
   const response=await fetch("/api/jobs",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json","Idempotency-Key":operation.key},body:operation.body,signal:controller.signal});
   if(response.status===401){tracker.expire();return;}
   const result=await response.json();if(!state.active)return;
   if(response.status>=400&&response.status<500){remember(null);setMode("error");setError(result.error?.message??"提交参数不正确，请检查素材");locked.current=false;return;}
   if(response.status!==202||!isJob(result.job))throw new Error("提交结果无效");
   remember(null);setDraftEnabled(false);const cleared=clearDraft();setDraftMessage(cleared?"作品已受理，草稿已清空":"作品已受理，但无法清除本地草稿，请检查浏览器存储设置。");tracker.seed([result.job]);
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
 if(sourceState==="loading")return <p role="status">正在恢复原作品…</p>;
 if(sourceState==="error")return <div><p role="alert">无法恢复原作品，请检查访问权限后重试。</p><button onClick={()=>{setSourceState("loading");setSourceAttempt(value=>value+1);}}>重新读取原作品</button></div>;
 return <section className="submission-panel" aria-labelledby={heading}>
  <h2 id={heading}>上传素材</h2><p className="form-help">准备 {template.requiredImageCount} 张图片，支持JPEG、PNG，每张最多5 MiB、2000万像素。</p>
  <form onSubmit={event=>{event.preventDefault();void submit();}}>
   {sourceJobId&&<p className="form-help">正在编辑原作品；提交会创建新版本并保留原记录。</p>}
   <UploadSlots initialIds={assets} key={resetKey} template={template} onChange={ids=>{setDraftEnabled(true);setAssets(ids);}} disabled={mode==="submitting"||mode==="unknown"}/>
   {template.id==="demo-postcard"&&<PostcardEditor value={parameters} onChange={value=>{setDraftEnabled(true);setParameters(value);}} assets={assets} disabled={mode==="submitting"||mode==="unknown"}/>}
   <div className="draft-bar">{draftMessage&&<p role="status">{draftMessage}</p>}<button type="button" disabled={mode==="submitting"||mode==="unknown"} onClick={discardDraft}>清空草稿</button></div>
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
  {jobs.length>0&&<section aria-label="已受理任务" className="job-receipts"><h3>已受理任务</h3><JobCards onAccepted={job=>tracker.seed([job])} onExpire={()=>tracker.expire()} jobs={jobs} errors={snapshot.errors} onRetry={id=>tracker.retry(id)} headingLevel={4}/></section>}
 </section>;
}
