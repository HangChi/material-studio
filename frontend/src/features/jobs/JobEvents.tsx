"use client";
import { useEffect, useId, useRef, useState } from "react";
type Event={version:number;stage:string|null;kind:string;createdAt:string;message:string};
function isEvent(value:unknown):value is Event{
 if(!value||typeof value!=="object")return false;
 const event=value as Event;return Number.isInteger(event.version)&&typeof event.kind==="string"&&typeof event.message==="string"&&typeof event.createdAt==="string"&&Number.isFinite(Date.parse(event.createdAt));
}
export function JobEvents({id,version,onExpire}:{id:string;version:number;onExpire:()=>void}){
 const panel=useId();const [open,setOpen]=useState(false),[attempt,setAttempt]=useState(0);
 const [state,setState]=useState({items:[] as Event[],loading:false,error:""});
 const expire=useRef(onExpire);useEffect(()=>{expire.current=onExpire;},[onExpire]);
 useEffect(()=>{
  if(!open)return;
  let active=true;const controller=new AbortController();
  void (async()=>{
   await Promise.resolve();if(!active)return;
   setState(old=>({...old,loading:true,error:""}));
   try{
    const response=await fetch(`/api/jobs/${id}/events`,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
    if(!active)return;if(response.status===401){expire.current();return;}
    const payload=await response.json();if(!active)return;
    if(!response.ok||!Array.isArray(payload.items)||!payload.items.every(isEvent))throw new Error("Invalid events");
    setState({items:[...payload.items].sort((a,b)=>a.version-b.version),loading:false,error:""});
   }catch{if(active)setState(old=>({...old,loading:false,error:"执行详情读取失败，任务状态保持不变。"}));}
  })();
  return()=>{active=false;controller.abort();};
 },[id,version,open,attempt]);
 return <div className="job-events"><button type="button" aria-expanded={open} aria-controls={panel} aria-label={`${open?"收起":"查看"}执行详情 ${id}`} onClick={()=>setOpen(value=>!value)}>{open?"收起执行详情":"查看执行详情"}</button>
  {open&&<div id={panel} className="event-panel">
   {state.loading&&<p role="status">正在读取执行详情…</p>}
   {state.error&&<div><p role="alert">{state.error}</p><button type="button" aria-label={`重新读取详情 ${id}`} onClick={()=>setAttempt(value=>value+1)}>重新读取详情</button></div>}
   {!state.loading&&!state.error&&state.items.length===0&&<p>暂无阶段事件，任务可能正在等待处理。</p>}
   <ol className="event-timeline">{state.items.map(event=><li key={event.version}><span className="event-kind">{({STARTED:"开始",COMPLETED:"完成",FAILED:"失败",INTERRUPTED:"中断"})[event.kind]??event.kind}</span><span>{event.message}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("zh-CN")}</time></li>)}</ol>
  </div>}
 </div>;
}
