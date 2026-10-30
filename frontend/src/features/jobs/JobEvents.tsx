"use client";
import { StudioIcon } from "../../components/StudioIcon";
import { useEffect, useId, useRef, useState } from "react";
type Event={version:number;stage:string|null;kind:string;createdAt:string;message:string};
function isEvent(value:unknown):value is Event{
 if(!value||typeof value!=="object")return false;
 const event=value as Event;return Number.isInteger(event.version)&&typeof event.kind==="string"&&typeof event.message==="string"&&typeof event.createdAt==="string"&&Number.isFinite(Date.parse(event.createdAt));
}
export function JobEvents({id,version,title,onExpire}:{id:string;version:number;title?:string;onExpire:()=>void}){
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null);
 const panel=useId();const [open,setOpen]=useState(false),[attempt,setAttempt]=useState(0);
 const [state,setState]=useState({items:[] as Event[],loading:false,error:""});
 useEffect(()=>{
  if(!open||!dialog.current)return;
  const node=dialog.current,button=trigger.current,body=document.body;
  const overflow=body.style.overflow,padding=body.style.paddingRight;
  const gutter=window.innerWidth-document.documentElement.clientWidth;
  if(gutter>0)body.style.paddingRight=`${parseFloat(window.getComputedStyle(body).paddingRight||"0")+gutter}px`;
  body.style.overflow="hidden";
  node.showModal();
  return()=>{
   if(node.open)node.close();
   body.style.overflow=overflow;body.style.paddingRight=padding;
   button?.focus({preventScroll:true});
  };
 },[open]);
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
 return <div className="job-events"><button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={panel} aria-label={`查看执行详情 ${id}`} onClick={()=>setOpen(true)}><StudioIcon name="history"/>查看执行详情</button>
  {open&&<dialog ref={dialog} id={panel} className="event-dialog" aria-labelledby={`${panel}-title`} aria-describedby={`${panel}-description`} onCancel={event=>{event.preventDefault();setOpen(false);}} onClose={()=>setOpen(false)} onClick={event=>{
   if(event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setOpen(false);
  }}>
   <div className="event-dialog-heading"><div><h2 id={`${panel}-title`}>执行详情</h2><p id={`${panel}-description`}>{title??"当前任务"}<span>任务编号：{id}</span></p></div><button type="button" aria-label="关闭执行详情" onClick={()=>setOpen(false)}>关闭</button></div>
   <div className="event-dialog-body" tabIndex={0} role="region" aria-label="执行事件">
   {state.loading&&<p role="status">正在读取执行详情…</p>}
   {state.error&&<div><p role="alert">{state.error}</p><button type="button" aria-label={`重新读取详情 ${id}`} onClick={()=>setAttempt(value=>value+1)}>重新读取详情</button></div>}
   {!state.loading&&!state.error&&state.items.length===0&&<p>暂无阶段事件，任务可能正在等待处理。</p>}
   <ol className="event-timeline">{state.items.map(event=><li key={event.version}><span className="event-kind">{({STARTED:"开始",COMPLETED:"完成",FAILED:"失败",INTERRUPTED:"中断",RESUMED:"断点恢复"})[event.kind]??event.kind}</span><span>{event.message}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("zh-CN")}</time></li>)}</ol>
   </div>
  </dialog>}
 </div>;
}
