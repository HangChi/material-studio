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
type Filters={q:string;templateId:string;status:string;from:string;to:string;favorite:boolean;hidden:boolean};
const emptyFilters:Filters={q:"",templateId:"",status:"",from:"",to:"",favorite:false,hidden:false};
function matches(job:Job,filter:Filters){
 return !!job.hidden===filter.hidden&&(!filter.favorite||job.favorite)&&(!filter.templateId||job.templateId===filter.templateId)&&(!filter.q||[job.displayName,job.templateTitle].some(title=>title?.toLocaleLowerCase().includes(filter.q.toLocaleLowerCase())))&&(!filter.status||(filter.status==="CANCELLED"?job.errorCode==="JOB_CANCELLED":job.status===filter.status&&(filter.status!=="FAILED"||job.errorCode!=="JOB_CANCELLED")))&&(!filter.from||Date.parse(job.createdAt)>=new Date(`${filter.from}T00:00:00`).getTime())&&(!filter.to||Date.parse(job.createdAt)<new Date(new Date(`${filter.to}T00:00:00`).getTime()+86400000).getTime());
}
function TemplateFilter({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [items,setItems]=useState<{id:string;title:string}[]>([]),[status,setStatus]=useState<"loading"|"ready"|"error">("loading"),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  fetch("/api/templates",{cache:"no-store",signal:controller.signal}).then(async response=>{
   const payload=await response.json();
   if(!response.ok||!Array.isArray(payload.items)||!payload.items.every((item:Record<string,unknown>)=>item&&typeof item.id==="string"&&typeof item.title==="string"))throw new Error("Invalid templates");
   if(active){setItems(payload.items);setStatus("ready");}
  }).catch(()=>{if(active)setStatus("error");});
  return()=>{active=false;controller.abort();};
 },[attempt]);
 return <div><label>模板<select value={value} disabled={status!=="ready"} onChange={event=>onChange(event.target.value)}><option value="">全部模板</option>{value&&!items.some(item=>item.id===value)&&<option value={value}>已选模板</option>}{items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
 {status==="loading"&&<p role="status">正在加载模板选项…</p>}{status==="error"&&<><p role="alert">模板选项暂时不可用，仍可查看记录。</p><button type="button" onClick={()=>{setStatus("loading");setAttempt(value=>value+1);}}>重新加载模板选项</button></>}</div>;
}
function HistoryBody({owner}:{owner:string}){
 const [form,setForm]=useState(emptyFilters),[filter,setFilter]=useState(emptyFilters);
 return <><form className="history-filters" onSubmit={event=>{event.preventDefault();setFilter({...form});}}>
  <label>搜索作品<input aria-label="搜索作品" value={form.q} maxLength={60} placeholder="名称或模板" onChange={event=>setForm({...form,q:event.target.value})}/></label>
  <TemplateFilter value={form.templateId} onChange={templateId=>setForm({...form,templateId})}/>
  <label>任务状态<select value={form.status} onChange={event=>setForm({...form,status:event.target.value})}><option value="">全部状态</option>{[["QUEUED","待处理任务"],["RUNNING","正在制作"],["SUCCEEDED","成功任务"],["FAILED","失败任务"],["CANCELLED","取消任务"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
  <label>开始日期<input type="date" value={form.from} onChange={event=>setForm({...form,from:event.target.value})}/></label><label>结束日期<input type="date" value={form.to} min={form.from} onChange={event=>setForm({...form,to:event.target.value})}/></label>
  <label><input type="checkbox" checked={form.favorite} onChange={event=>setForm({...form,favorite:event.target.checked})}/>只看收藏</label><label><input type="checkbox" checked={form.hidden} onChange={event=>setForm({...form,hidden:event.target.checked})}/>查看已隐藏作品</label>
  <button type="submit">应用筛选</button><button type="button" onClick={()=>{setForm(emptyFilters);setFilter(emptyFilters);}}>重置筛选</button>
 </form><HistoryResults key={JSON.stringify(filter)} owner={owner} filter={filter}/></>;
}
function HistoryResults({owner,filter}:{owner:string;filter:Filters}){
 const filtered=Object.values(filter).some(Boolean);
 const params=new URLSearchParams();for(const key of ["q","templateId","status"] as const)if(filter[key])params.set(key,filter[key]);
 if(filter.favorite)params.set("favorite","true");if(filter.hidden)params.set("hidden","true");if(filter.from)params.set("from",new Date(`${filter.from}T00:00:00`).toISOString());if(filter.to)params.set("to",new Date(new Date(`${filter.to}T00:00:00`).getTime()+86400000).toISOString());const query=params.toString();
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
  const paths=[read(`/api/jobs?limit=20${more?`&cursor=${encodeURIComponent(state.cursor!)}`:""}${query?`&${query}`:""}`,true)];
  if(!more)paths.push(read("/api/jobs/active",false));
  const results=await Promise.allSettled(paths);if(!current())return;
  if(results.some(result=>result.status==="rejected"&&result.reason instanceof IdentityExpired)){tracker.expire();state.locked=false;setPage(previous=>({...previous,loading:false}));return;}
  for(const result of results)if(result.status==="fulfilled")tracker.seed(result.value.items);
  const first=results[0];if(first.status==="fulfilled"){
   state.cursor=first.value.nextCursor;
  }
  state.locked=false;state.controller=null;
  setPage(previous=>({loading:false,loaded:previous.loaded||first.status==="fulfilled",cursor:state.cursor,error:results.some(result=>result.status==="rejected")?"记录查询失败，已保留现有记录，请重试。":""}));
 },[tracker,query]);
 useEffect(()=>{
  const state=resources.current;state.active=true;void load(false);
  return()=>{state.active=false;state.serial++;state.locked=false;state.controller?.abort();};
 },[load]);
 if(snapshot.authExpired)return <p role="alert">访客身份已失效，请刷新页面重新建立。</p>;
 return <section aria-label="个人制作记录">
  <div className="history-toolbar"><p>记录保存在当前访客名下，未完成任务会自动更新。</p><button type="button" disabled={page.loading} onClick={()=>void load(false)}>刷新记录</button></div>
  {page.loading&&!page.loaded&&<p role="status">正在读取制作记录…</p>}
  {page.error&&<p className="query-error" role="alert">{page.error}</p>}
  {page.loaded&&snapshot.jobs.filter(job=>matches(job,filter)).length===0&&<div className="state-panel"><h2>{filtered?"没有匹配的作品":"还没有制作记录"}</h2><p>{filtered?"调整筛选条件后重新查询。":"挑选一张模板，开始你的第一份作品。"}</p>{!filtered&&<Link className="text-action" href="/">去挑选模板</Link>}</div>}
  <JobCards onAccepted={job=>tracker.seed([job])} onExpire={()=>tracker.expire()} jobs={snapshot.jobs.filter(job=>matches(job,filter))} errors={snapshot.errors} onRetry={id=>tracker.retry(id)}/>
  {page.cursor&&<div className="history-more"><button type="button" disabled={page.loading} onClick={()=>void load(true)}>{page.loading?"正在加载…":"加载更多"}</button></div>}
 </section>;
}
