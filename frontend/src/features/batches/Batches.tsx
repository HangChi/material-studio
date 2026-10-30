"use client";
import {useEffect,useRef,useState} from "react";
import {SessionGate} from "../identity/SessionGate";
import {UploadSlots} from "../assets/UploadSlots";
import {JobCards} from "../jobs/JobCards";
import {isJob,unfinished} from "../jobs/JobTracker";
import {useJobTracker} from "../jobs/useJobTracker";
import type {Job} from "../jobs/types";
import type {Template} from "../templates/types";
type Batch={id:string;name:string;createdAt?:string;items:Job[]};
type Row={id:string;templateId:string;assetIds:(string|null)[]};
type Pending={key:string;body:string};
function validBatch(value:Batch){return value&&typeof value.id==="string"&&typeof value.name==="string"&&Array.isArray(value.items)&&value.items.every(isJob);}
function mergeBatchPage(previous:Batch[],incoming:Batch[],more:boolean,protectedIds:ReadonlySet<string>):Batch[]{
 const preserved=previous.filter(batch=>protectedIds.has(batch.id));
 const page=more?[...previous,...incoming]:incoming;
 const merged=new Map(page.map(batch=>[batch.id,batch]));
 for(const batch of preserved)merged.set(batch.id,batch);
 return [...preserved,...[...merged.values()].filter(batch=>!protectedIds.has(batch.id))];
}
export function Batches(){return <SessionGate>{owner=><BatchBody key={owner} owner={owner}/>}</SessionGate>;}
function BatchBody({owner}:{owner:string}){
 const {tracker,snapshot}=useJobTracker(owner),storage=`material-batch-pending:${owner}`;
 const [pending,setPending]=useState<Pending|null>(()=>{try{const v=JSON.parse(sessionStorage.getItem(storage)??"null");return v&&typeof v.key==="string"&&typeof v.body==="string"?v:null;}catch{return null;}});
 const [mode,setMode]=useState<"idle"|"busy"|"unknown">(pending?"unknown":"idle"),[templates,setTemplates]=useState<Template[]>([]),[batches,setBatches]=useState<Batch[]>([]),[rows,setRows]=useState<Row[]>([]),[name,setName]=useState("新批次"),[error,setError]=useState(""),[warning,setWarning]=useState(""),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(false),[cancelling,setCancelling]=useState<string|null>(null);
 const life=useRef({active:true,controllers:new Set<AbortController>(),locked:!!pending,reading:false,acceptedDuringRead:new Set<string>()});
 function remember(value:Pending|null){setPending(value);try{if(value)sessionStorage.setItem(storage,JSON.stringify(value));else sessionStorage.removeItem(storage);}catch{setWarning("浏览器存储不可用，请保留此页以便安全重试。");}}
 function accept(batch:Batch){
  if(life.current.reading)life.current.acceptedDuringRead.add(batch.id);
  setBatches(previous=>[batch,...previous.filter(item=>item.id!==batch.id)]);
  tracker.seed(batch.items);
 }
 async function load(more=false){
  const state=life.current;
  if(state.reading)return;
  state.reading=true;
  state.acceptedDuringRead.clear();
  const c=new AbortController();
  state.controllers.add(c);setLoading(true);setError("");
  try{
   const response=await fetch(`/api/batches?limit=20${more&&cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`,{signal:c.signal,cache:"no-store"});
   if(response.status===401){tracker.expire();return;}
   const p=await response.json();
   if(!state.active)return;
   if(!response.ok||!Array.isArray(p.items)||!p.items.every(validBatch)){
    throw new Error("批次记录暂时不可用，请重试。");
   }
   // Copy before the state updater runs: later requests can reuse the lifecycle set.
   const protectedIds=new Set(state.acceptedDuringRead);
   setBatches(previous=>mergeBatchPage(previous,p.items,more,protectedIds));
   setCursor(p.nextCursor);
   for(const batch of p.items as Batch[])tracker.seed(batch.items);
  }catch(e){
   if(state.active)setError(e instanceof Error?e.message:"批次查询失败");
  }finally{
   state.reading=false;
   state.controllers.delete(c);
   if(state.active)setLoading(false);
  }
 }
 useEffect(()=>{
  const state=life.current;state.active=true;const c=new AbortController();state.controllers.add(c);
  fetch("/api/templates",{signal:c.signal,cache:"no-store"}).then(async r=>{const p=await r.json();if(!r.ok||!Array.isArray(p.items))throw new Error();if(state.active){setTemplates(p.items);setRows(previous=>previous.length?previous:[{id:crypto.randomUUID(),templateId:p.items[0]?.id??"",assetIds:[]}]);}}).catch(()=>{if(state.active)setError("模板加载失败，请刷新页面重试。");});
  void Promise.resolve().then(()=>{if(state.active)void load();});return()=>{state.active=false;for(const controller of state.controllers)controller.abort();};
 // This owner-keyed component owns a single initialization and request lifecycle.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function submit(retry=false){
  const state=life.current;if(retry?mode!=="unknown"||!pending:state.locked)return;
  const op=retry?pending!:{key:crypto.randomUUID(),body:JSON.stringify({name,items:rows.map(row=>({templateId:row.templateId,assetIds:row.assetIds}))})};
  state.locked=true;remember(op);setMode("busy");setError("");const c=new AbortController();state.controllers.add(c);
  try{const response=await fetch("/api/batches",{method:"POST",headers:{"content-type":"application/json","Idempotency-Key":op.key},body:op.body,signal:c.signal});if(!state.active)return;if(response.status===401){tracker.expire();return;}
   const p=await response.json();if(!state.active)return;if(response.status>=400&&response.status<500){remember(null);state.locked=false;setMode("idle");setError(p.error?.message??"批次参数无效，请检查后重试");return;}
   if(response.status!==202||!validBatch(p.batch))throw new Error();accept(p.batch);remember(null);setMode("idle");state.locked=false;setRows([{id:crypto.randomUUID(),templateId:templates[0]?.id??"",assetIds:[]}]);
  }catch{if(state.active){setMode("unknown");setError("批次提交结果未确认，请安全重试同一批次，避免重复制作。");}}finally{state.controllers.delete(c);}
 }
 async function cancel(id:string){
  if(cancelling)return;setCancelling(id);const c=new AbortController();life.current.controllers.add(c);
  try{const r=await fetch(`/api/batches/${id}/cancel`,{method:"POST",signal:c.signal});const p=await r.json();if(!life.current.active)return;if(r.status===401){tracker.expire();return;}if(!r.ok||!validBatch(p.batch))throw new Error();accept(p.batch);}catch{if(life.current.active)setError("取消请求失败，请刷新核对批次。");}finally{life.current.controllers.delete(c);if(life.current.active)setCancelling(null);}
 }
 const ready=rows.length>0&&rows.every(row=>{const t=templates.find(t=>t.id===row.templateId);return t&&row.assetIds.length===t.requiredImageCount&&row.assetIds.every(Boolean);});
 if(snapshot.authExpired)return <p role="alert">身份已失效，请刷新后重新建立。</p>;
 return <><form className="batch-form" onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={mode!=="idle"}><label>批次名称<input value={name} maxLength={60} onChange={e=>setName(e.target.value)}/></label>
 {rows.map((row,index)=>{const template=templates.find(t=>t.id===row.templateId);return <section className="batch-item" key={row.id}><div className="batch-item-heading"><h2>制作项 {index+1}</h2><label>模板<select aria-label={`制作项 ${index+1} 模板`} value={row.templateId} onChange={e=>setRows(previous=>previous.map(item=>item.id===row.id?{...item,templateId:e.target.value,assetIds:[]}:item))}>{templates.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><button type="button" disabled={rows.length===1} onClick={()=>setRows(rows.filter(item=>item.id!==row.id))}>移除制作项 {index+1}</button></div>{template&&<UploadSlots key={template.id} template={template} onChange={assetIds=>setRows(previous=>previous.map(item=>item.id===row.id?{...item,assetIds}:item))}/>}</section>;})}
 <button type="button" disabled={rows.length>=10||!templates.length} onClick={()=>setRows([...rows,{id:crypto.randomUUID(),templateId:templates[0]?.id??"",assetIds:[]}])}>增加制作项</button><button className="primary" type="submit" disabled={!ready}>提交批次</button></fieldset></form>
 {error&&<p role="alert">{error}</p>}{warning&&<p role="status">{warning}</p>}{mode==="unknown"&&<button type="button" onClick={()=>void submit(true)}>安全重试批次</button>}
 <div className="history-toolbar"><h2>我的批次</h2><button disabled={loading} onClick={()=>void load()}>刷新批次</button></div>{loading&&<p role="status">正在读取批次…</p>}
 {batches.map(batch=>{const jobs=batch.items.map(job=>snapshot.jobs.find(item=>item.id===job.id)??job);return <section className="batch-record" key={batch.id}><h2>{batch.name}</h2><p>已结束 {jobs.filter(job=>!unfinished(job)).length} / {jobs.length} 项 · 批次编号：{batch.id}</p>{jobs.some(unfinished)&&<button disabled={!!cancelling} onClick={()=>void cancel(batch.id)}>取消未完成项 {batch.name}</button>}<JobCards jobs={jobs} errors={snapshot.errors} onRetry={id=>tracker.retry(id)} onAccepted={job=>tracker.seed([job])} onExpire={()=>tracker.expire()}/></section>;})}
 {cursor&&<button disabled={loading} onClick={()=>void load(true)}>加载更多批次</button>}</>;
}
