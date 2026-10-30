"use client";
import {useEffect,useRef,useState} from "react";
import {StudioIcon} from "../../components/StudioIcon";
import {SessionGate} from "../identity/SessionGate";
import {SessionExpired} from "../identity/SessionExpired";
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
 function isRowReady(row:Row){
  const template=templates.find(item=>item.id===row.templateId);
  return !!template&&row.assetIds.length===template.requiredImageCount&&row.assetIds.every(Boolean);
 }
 const readyCount=rows.filter(isRowReady).length;
 const ready=rows.length>0&&readyCount===rows.length;
 const requiredImages=rows.reduce((total,row)=>total+(templates.find(template=>template.id===row.templateId)?.requiredImageCount??0),0);
 const preparedImages=rows.reduce((total,row)=>total+row.assetIds.filter(Boolean).length,0);
 if(snapshot.authExpired)return <SessionExpired/>;
 return <>
  <form className="batch-form" onSubmit={event=>{event.preventDefault();void submit();}}>
   <fieldset className="batch-editing" disabled={mode!=="idle"}>
    <div className="batch-layout">
     <div className="batch-composer">
      <div className="batch-setup"><div><h2>创建新批次</h2><p>为每个制作项选择模板和图片</p></div><span className="batch-capacity">{rows.length} / 10 项</span><label>批次名称<input value={name} maxLength={60} placeholder="给这组作品起个名字" onChange={event=>setName(event.target.value)}/></label></div>
      <div className="batch-items">{rows.map((row,index)=>{
       const template=templates.find(item=>item.id===row.templateId);
       const complete=isRowReady(row);
       return <section className={`batch-item${complete?" item-ready":""}`} aria-label={`制作项 ${index+1}`} key={row.id}>
        <div className="batch-item-heading">
         <span className="batch-item-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
         <div className="batch-item-title"><h2>制作项 {index+1}</h2><span className={`batch-item-status${complete?" is-ready":""}`}>{complete?"素材已就绪":"待添加素材"}</span></div>
         <label className="batch-template-field">模板<select aria-label={`制作项 ${index+1} 模板`} value={row.templateId} onChange={event=>setRows(previous=>previous.map(item=>item.id===row.id?{...item,templateId:event.target.value,assetIds:[]}:item))}>{templates.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
         <button className="batch-remove" type="button" aria-label={`移除制作项 ${index+1}`} disabled={rows.length===1} onClick={()=>setRows(previous=>previous.filter(item=>item.id!==row.id))}><StudioIcon name="remove"/><span>移除</span></button>
        </div>
        {template&&<div className="batch-item-body"><p className="batch-image-requirements"><span>需要 {template.requiredImageCount} 张图片</span><span>JPEG / PNG</span><span>每张 ≤ 5 MiB</span></p><UploadSlots key={template.id} template={template} onChange={assetIds=>setRows(previous=>previous.map(item=>item.id===row.id?{...item,assetIds}:item))}/></div>}
       </section>;
      })}</div>
      <button className="batch-add" type="button" aria-label="增加制作项" disabled={rows.length>=10||!templates.length} onClick={()=>setRows(previous=>[...previous,{id:crypto.randomUUID(),templateId:templates[0]?.id??"",assetIds:[]}])}><StudioIcon name="plus"/>增加制作项<span>{rows.length>=10?"已达 10 项上限":"每批最多 10 项"}</span></button>
     </div>
     <aside className="batch-summary" aria-label="批次概览">
      <div className="batch-summary-title"><StudioIcon name="templates"/><h2>批次概览</h2></div>
      <p className="batch-prepared" role="status">已就绪 <strong>{readyCount}</strong> / {rows.length} 项</p>
      <progress aria-label="素材准备进度" max={rows.length||1} value={readyCount}/>
      <p className="batch-image-count">已准备 {preparedImages} / {requiredImages} 张图片</p>
      <ul className="batch-summary-items">{rows.map((row,index)=>{const template=templates.find(item=>item.id===row.templateId);return <li key={row.id}><span className={isRowReady(row)?"ready-dot":""} aria-hidden="true"/><span>{index+1}. {template?.title??"选择模板"}</span><small>{row.assetIds.filter(Boolean).length} / {template?.requiredImageCount??0}</small></li>;})}</ul>
      <p className={`batch-readiness${ready?" is-ready":""}`}>{ready?"素材已准备好，可以提交":"为每个制作项添加所需图片后提交"}</p>
      <button className="primary batch-submit" type="submit" aria-label="提交批次" disabled={!ready}>{mode==="busy"?"正在提交…":"提交批次"}<StudioIcon name="arrow"/></button>
      <p className="batch-summary-help">提交后可离开页面，后台会继续制作。<br/>明信片使用默认排版。</p>
     </aside>
    </div>
   </fieldset>
  </form>
  {error&&<p className="batch-feedback" role="alert">{error}</p>}{warning&&<p className="batch-feedback" role="status">{warning}</p>}{mode==="unknown"&&<div className="batch-retry"><button type="button" onClick={()=>void submit(true)}>安全重试批次</button><p>重试同一次提交，不会重复创建批次。</p></div>}
  <section className="batch-history" aria-label="批次记录">
   <div className="batch-history-heading"><div><h2>我的批次<span>已加载 {batches.length} 批</span></h2><p>查看每个制作项的进度与结果</p></div><button type="button" disabled={loading} onClick={()=>void load()}><StudioIcon name="repeat"/>刷新批次</button></div>
   {loading&&<p role="status">正在读取批次…</p>}
   {!loading&&!batches.length&&<div className="batch-empty"><StudioIcon name="history"/><h3>还没有批次记录</h3><p>准备好上方素材后，提交你的第一组作品。</p></div>}
   {batches.map(batch=>{
    const jobs=batch.items.map(job=>snapshot.jobs.find(item=>item.id===job.id)??job);
    const finished=jobs.filter(job=>!unfinished(job)).length;
    return <section className="batch-record" key={batch.id}>
     <div className="batch-record-heading"><div><h2>{batch.name}</h2><p>已结束 {finished} / {jobs.length} 项</p></div>{jobs.some(unfinished)&&<button type="button" disabled={!!cancelling} onClick={()=>void cancel(batch.id)}>取消未完成项 {batch.name}</button>}</div>
     <progress aria-label={`${batch.name} 制作进度`} max={jobs.length||1} value={finished}/>
     <p className="batch-record-id">批次编号：{batch.id}</p>
     <JobCards jobs={jobs} errors={snapshot.errors} onRetry={id=>tracker.retry(id)} onAccepted={job=>tracker.seed([job])} onExpire={()=>tracker.expire()}/>
    </section>;
   })}
   {cursor&&<button type="button" className="batch-load-more" disabled={loading} onClick={()=>void load(true)}>加载更多批次</button>}
  </section>
 </>;
}
