"use client";
import {useEffect,useRef,useState} from "react";
import type {Job} from "./types";
import {isJob} from "./JobTracker";
export function BulkControls({jobs,selected,onSelect,onUpdated,onExpire}:{jobs:Job[];selected:string[];onSelect:(ids:string[])=>void;onUpdated:(jobs:Job[])=>void;onExpire:()=>void}){
 const [tags,setTags]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");const life=useRef({active:true,controller:null as AbortController|null});
 useEffect(()=>{const state=life.current;state.active=true;return()=>{state.active=false;state.controller?.abort();};},[]);
 async function perform(changes?:Record<string,unknown>){
  const state=life.current;if(state.controller||!selected.length)return;const c=new AbortController();state.controller=c;setBusy(true);setError("");const ids=[...selected];
  try{const r=await fetch(changes?"/api/works/bulk":"/api/works/archive",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ids,...changes}),signal:c.signal});if(!state.active)return;if(r.status===401){onExpire();return;}
   if(!r.ok){const p=await r.json();throw new Error(p.error?.message??"批量操作失败，请重试");}
   if(changes){const p=await r.json();if(!state.active)return;if(!Array.isArray(p.items)||!p.items.every(isJob))throw new Error("批量操作响应无效");onUpdated(p.items);onSelect([]);}
   else{const blob=await r.blob();if(!state.active)return;if(!r.headers.get("content-type")?.includes("application/zip"))throw new Error("下载响应无效");const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="works.zip";a.click();URL.revokeObjectURL(url);}
  }catch(e){if(state.active)setError(e instanceof Error?e.message:"批量操作失败");}finally{state.controller=null;if(state.active)setBusy(false);}
 }
 const canDownload=selected.length>0&&selected.length<=20&&selected.every(id=>jobs.find(job=>job.id===id)?.status==="SUCCEEDED");
 return <section className="bulk-panel" aria-label="批量管理"><div className="job-actions"><button disabled={busy} onClick={()=>onSelect(jobs.slice(0,50).map(job=>job.id))}>选择已加载作品（最多50项）</button><button disabled={busy||!selected.length} onClick={()=>onSelect([])}>清空选择</button><span role="status">已选择 {selected.length} 项</span></div><div className="job-actions"><button disabled={busy||!selected.length} onClick={()=>void perform({favorite:true})}>批量收藏</button><button disabled={busy||!selected.length} onClick={()=>void perform({favorite:false})}>批量取消收藏</button><button disabled={busy||!selected.length} onClick={()=>void perform({hidden:true})}>批量隐藏</button><button disabled={busy||!selected.length} onClick={()=>void perform({hidden:false})}>批量恢复</button><button disabled={busy||!canDownload} onClick={()=>void perform()}>下载所选 ZIP</button></div><label>批量标签（逗号分隔，覆盖原标签）<input value={tags} disabled={busy} onChange={e=>setTags(e.target.value)} /></label><button disabled={busy||!selected.length} onClick={()=>void perform({tags:tags.split(/[,，]/).map(tag=>tag.trim()).filter(Boolean)})}>设置所选标签</button>{busy&&<p role="status">正在处理所选作品…</p>}{error&&<p role="alert">{error}</p>}</section>;
}
