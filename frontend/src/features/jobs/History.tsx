"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SessionGate } from "../identity/SessionGate";
import { isJob } from "./JobTracker";
import { JobCards } from "./JobCards";
import { useJobTracker } from "./useJobTracker";
import type { Job } from "./types";
class IdentityExpired extends Error {}
export function History(){return <SessionGate allowSwitch>{owner=><HistoryBody key={owner} owner={owner}/>}</SessionGate>;}
function HistoryBody({owner}:{owner:string}){
 const {tracker,snapshot}=useJobTracker(owner);
 const [page,setPage]=useState({loading:true,loaded:false,error:"",cursor:null as string|null});
 const resources=useRef({active:true,serial:0,locked:false,controller:null as AbortController|null,cursor:null as string|null});
 const load=useCallback(async(more:boolean)=>{
  const state=resources.current;if(state.locked||tracker.getSnapshot().authExpired||(more&&!state.cursor))return;
  state.locked=true;const serial=++state.serial,controller=new AbortController();state.controller=controller;
  const current=()=>state.active&&serial===state.serial;
  await Promise.resolve();if(!current())return;
  setPage(previous=>({...previous,loading:true,error:""}));
  async function read(path:string,pagination:boolean){
   const response=await fetch(path,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   if(response.status===401)throw new IdentityExpired();
   const payload=await response.json();
   if(!response.ok||!Array.isArray(payload.items)||!payload.items.every(isJob)||(pagination&&payload.nextCursor!==null&&typeof payload.nextCursor!=="string"))throw new Error("Invalid history");
   return payload as {items:Job[];nextCursor:string|null};
  }
  const paths=[read(`/api/jobs?limit=20${more?`&cursor=${encodeURIComponent(state.cursor!)}`:""}`,true)];
  if(!more)paths.push(read("/api/jobs/active",false));
  const results=await Promise.allSettled(paths);if(!current())return;
  if(results.some(result=>result.status==="rejected"&&result.reason instanceof IdentityExpired)){tracker.expire();state.locked=false;setPage(previous=>({...previous,loading:false}));return;}
  for(const result of results)if(result.status==="fulfilled")tracker.seed(result.value.items);
  const first=results[0];if(first.status==="fulfilled"){
   state.cursor=first.value.nextCursor;
  }
  state.locked=false;state.controller=null;
  setPage(previous=>({loading:false,loaded:previous.loaded||first.status==="fulfilled",cursor:state.cursor,error:results.some(result=>result.status==="rejected")?"记录查询失败，已保留现有记录，请重试。":""}));
 },[tracker]);
 useEffect(()=>{
  const state=resources.current;state.active=true;void load(false);
  return()=>{state.active=false;state.serial++;state.locked=false;state.controller?.abort();};
 },[load]);
 if(snapshot.authExpired)return <p role="alert">访客身份已失效，请刷新页面重新建立。</p>;
 return <section aria-label="个人制作记录">
  <div className="history-toolbar"><p>记录保存在当前访客名下，未完成任务会自动更新。</p><button type="button" disabled={page.loading} onClick={()=>void load(false)}>刷新记录</button></div>
  {page.loading&&!page.loaded&&<p role="status">正在读取制作记录…</p>}
  {page.error&&<p className="query-error" role="alert">{page.error}</p>}
  {page.loaded&&snapshot.jobs.length===0&&<div className="state-panel"><h2>还没有制作记录</h2><p>挑选一张模板，开始你的第一份作品。</p><Link className="text-action" href="/">去挑选模板</Link></div>}
  <JobCards jobs={snapshot.jobs} errors={snapshot.errors} onRetry={id=>tracker.retry(id)}/>
  {page.cursor&&<div className="history-more"><button type="button" disabled={page.loading} onClick={()=>void load(true)}>{page.loading?"正在加载…":"加载更多"}</button></div>}
 </section>;
}
