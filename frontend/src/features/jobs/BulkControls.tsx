"use client";
import {useEffect,useRef,useState} from "react";
import type {Job} from "./types";
import {isJob} from "./JobTracker";
import {StudioIcon} from "../../components/StudioIcon";
export function BulkControls({jobs,selected,onSelect,onUpdated,onExpire}:{jobs:Job[];selected:string[];onSelect:(ids:string[])=>void;onUpdated:(jobs:Job[])=>void;onExpire:()=>void}){
 const [tags,setTags]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");const life=useRef({active:true,controller:null as AbortController|null});
 const selectionButton=useRef<HTMLButtonElement>(null);
 const restoreFocus=useRef(false);
 useEffect(()=>{if(!busy&&restoreFocus.current){restoreFocus.current=false;selectionButton.current?.focus({preventScroll:true});}},[busy]);
 useEffect(()=>{const state=life.current;state.active=true;return()=>{state.active=false;state.controller?.abort();};},[]);
 async function perform(changes?:Record<string,unknown>){
  const state=life.current;if(state.controller||!selected.length)return;const c=new AbortController();state.controller=c;setBusy(true);setError("");const ids=[...selected];
  try{const r=await fetch(changes?"/api/works/bulk":"/api/works/archive",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ids,...changes}),signal:c.signal});if(!state.active)return;if(r.status===401){onExpire();return;}
   if(!r.ok){const p=await r.json();throw new Error(p.error?.message??"批量操作失败，请重试");}
   if(changes){const p=await r.json();if(!state.active)return;if(!Array.isArray(p.items)||!p.items.every(isJob))throw new Error("批量操作响应无效");onUpdated(p.items);onSelect([]);}
   else{const blob=await r.blob();if(!state.active)return;if(!r.headers.get("content-type")?.includes("application/zip"))throw new Error("下载响应无效");const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="works.zip";a.click();URL.revokeObjectURL(url);}
  }catch(e){if(state.active)setError(e instanceof Error?e.message:"批量操作失败");}finally{state.controller=null;if(state.active){restoreFocus.current=true;setBusy(false);}}
 }
 const loadedIds=jobs.slice(0,50).map(job=>job.id);
 const allSelected=loadedIds.length>0&&loadedIds.every(id=>selected.includes(id));
 const canDownload=selected.length>0&&selected.length<=20&&selected.every(id=>jobs.find(job=>job.id===id)?.status==="SUCCEEDED");
 if(!jobs.length)return null;
 return <section className={`bulk-panel${selected.length?" has-selection":""}`} aria-label="批量管理" aria-busy={busy}>
  <div className="bulk-selection-bar">
   <button ref={selectionButton} className="bulk-select-toggle" type="button" disabled={busy} aria-pressed={allSelected?true:selected.length?"mixed":false} aria-label={allSelected?"取消选择已加载作品":"选择已加载作品（最多50项）"} onClick={()=>onSelect(allSelected?[]:loadedIds)}><span className={`bulk-select-box${allSelected?" is-checked":""}`} aria-hidden="true">{allSelected?"✓":selected.length?"−":""}</span>{allSelected?"取消全选":"全选"}</button>
   <div className="bulk-selection-copy"><strong role="status" aria-live="polite">已选择 {selected.length} 项</strong><span className="bulk-selection-limit">最多 50 项</span></div>
   {selected.length>0&&<button type="button" className="bulk-clear" disabled={busy} onClick={()=>{onSelect([]);selectionButton.current?.focus({preventScroll:true});}}>清空选择</button>}
  </div>
  {selected.length>0&&<div className="bulk-action-area">
   <div className="bulk-action-row">
    <div className="bulk-action-group"><button type="button" aria-label="批量收藏" disabled={busy} onClick={()=>void perform({favorite:true})}><StudioIcon name="star"/>收藏</button><button type="button" aria-label="批量取消收藏" disabled={busy} onClick={()=>void perform({favorite:false})}>取消收藏</button></div>
    <div className="bulk-action-group"><button type="button" aria-label="批量隐藏" disabled={busy} onClick={()=>void perform({hidden:true})}><StudioIcon name="hide"/>隐藏</button><button type="button" aria-label="批量恢复" disabled={busy} onClick={()=>void perform({hidden:false})}>恢复</button></div>
    <button type="button" className="bulk-download" aria-label="下载所选 ZIP" disabled={busy||!canDownload} onClick={()=>void perform()}><StudioIcon name="download"/>下载 ZIP</button>
   </div>
   {!canDownload&&<p className="bulk-download-help">仅支持打包最多 20 项已成功的作品</p>}
   <details className="bulk-tags"><summary><StudioIcon name="tag"/>设置标签<StudioIcon name="chevron"/></summary><div className="bulk-tag-fields"><label>批量标签<input value={tags} disabled={busy} placeholder="例如：旅行，周末" onChange={e=>setTags(e.target.value)}/></label><button type="button" disabled={busy} aria-label="设置所选标签" onClick={()=>void perform({tags:tags.split(/[,，]/).map(tag=>tag.trim()).filter(Boolean)})}>应用标签</button><p>用逗号分隔，将覆盖所选作品的原有标签；留空可清除标签。</p></div></details>
  </div>}
  {busy&&<p className="bulk-feedback" role="status">正在处理所选作品…</p>}{error&&<p className="bulk-feedback" role="alert">{error}</p>}
 </section>;
}
