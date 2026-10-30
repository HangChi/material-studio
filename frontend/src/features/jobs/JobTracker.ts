import type { Job } from "./types";
export type TrackerSnapshot={jobs:Job[];errors:Record<string,string>;authExpired:boolean};
export function isJob(value:unknown):value is Job {
 if(typeof value!=="object"||value===null)return false;
 const job=value as Record<string,unknown>;
 return typeof job.id==="string"&&job.id.length>0&&typeof job.templateTitle==="string"&&typeof job.createdAt==="string"&&Number.isFinite(Date.parse(job.createdAt))&&Number.isSafeInteger(job.version)&&Number(job.version)>=0&&["QUEUED","RUNNING","SUCCEEDED","FAILED"].includes(String(job.status));
}
function newestFirst(a:Job,b:Job){
 const fraction=(value:string)=>(value.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1]??"").padEnd(9,"0");
 return Date.parse(b.createdAt)-Date.parse(a.createdAt)||fraction(b.createdAt).localeCompare(fraction(a.createdAt))||b.id.localeCompare(a.id);
}
export const unfinished=(job:Job)=>job.status==="QUEUED"||job.status==="RUNNING";
export class JobTracker {
 private snapshot:TrackerSnapshot={jobs:[],errors:{},authExpired:false};
 private listeners=new Set<()=>void>();
 private owner:string|null=null;
 private epoch=0;
 private timers=new Map<string,ReturnType<typeof setTimeout>>();
 private requests=new Map<string,AbortController>();
 private source:EventSource|null=null;
 private streamKey="";
 private streamFailed=false;
 private watchdog:ReturnType<typeof setTimeout>|undefined;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.snapshot;
 private publish(next:TrackerSnapshot){this.snapshot=next;this.listeners.forEach(listener=>listener());}
 start(owner:string){this.stop();this.owner=owner;}
 stop(){
  this.owner=null;this.epoch++;
  this.closeStream();this.streamFailed=false;
  for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();
  for(const request of this.requests.values())request.abort();this.requests.clear();
  this.publish({jobs:[],errors:{},authExpired:false});
 }
 expire(){this.stop();this.publish({jobs:[],errors:{},authExpired:true});}
 seed(incoming:Job[]){
  if(!this.owner||this.snapshot.authExpired)return;
  const jobs=new Map(this.snapshot.jobs.map(job=>[job.id,job]));
  const errors={...this.snapshot.errors};
  for(const job of incoming){
   if(!isJob(job))continue;
   const previous=jobs.get(job.id);
   if(previous&&job.version===previous.version&&unfinished(previous)&&job.status===previous.status&&typeof job.queueAhead==="number")jobs.set(job.id,{...previous,queueAhead:job.queueAhead});
   if(previous&&(job.version<=previous.version||!unfinished(previous)&&job.status!==previous.status))continue;
   jobs.set(job.id,job);
   if(!unfinished(job)){this.cancel(job.id);delete errors[job.id];}
  }
  this.publish({...this.snapshot,jobs:[...jobs.values()].sort(newestFirst),errors});
  this.reconcile();
 }
 private closeStream(){
  const source=this.source;this.source=null;this.streamKey="";
  if(this.watchdog!==undefined)clearTimeout(this.watchdog);this.watchdog=undefined;
  source?.close();
 }
 private usePolling(){
  this.closeStream();this.streamFailed=true;
  if(!this.owner||this.snapshot.authExpired)return;
  for(const job of this.snapshot.jobs)if(unfinished(job)&&!this.snapshot.errors[job.id]&&!this.requests.has(job.id)){this.cancel(job.id);void this.read(job.id);}
 }
 private reconcile(){
  if(!this.owner||this.snapshot.authExpired)return;
  const pending=this.snapshot.jobs.filter(job=>unfinished(job)&&!this.snapshot.errors[job.id]);
  if(!pending.length){this.closeStream();return;}
  if(this.streamFailed||typeof EventSource==="undefined"){for(const job of pending)this.schedule(job);return;}
  if(pending.length>50){this.usePolling();return;}
  const ids=pending.map(job=>job.id).sort(),key=ids.join(",");if(this.source&&this.streamKey===key)return;
  this.closeStream();for(const job of pending)this.cancel(job.id);
  let source:EventSource;
  try{source=new EventSource(`/api/jobs/stream?ids=${encodeURIComponent(key)}`,{withCredentials:true});}catch{this.usePolling();return;}
  this.source=source;this.streamKey=key;const epoch=this.epoch;
  const current=()=>this.owner!==null&&this.epoch===epoch&&this.source===source;
  const arm=()=>{if(this.watchdog!==undefined)clearTimeout(this.watchdog);this.watchdog=setTimeout(()=>{if(current())this.usePolling();},20000);};
  source.addEventListener("jobs",event=>{
   if(!current())return;
   try{
    const payload:unknown=JSON.parse((event as MessageEvent<string>).data);
    const items=payload&&typeof payload==="object"?(payload as Record<string,unknown>).items:undefined;
    if(!Array.isArray(items)||items.length!==ids.length||!items.every(isJob)||new Set(items.map(job=>job.id)).size!==ids.length||items.some(job=>!ids.includes(job.id)))throw new Error("Invalid stream snapshot");
    arm();this.seed(items);
   }catch{if(current())this.usePolling();}
  });
  source.addEventListener("heartbeat",()=>{if(current())arm();});
  source.addEventListener("expired",()=>{if(current())this.expire();});
  source.addEventListener("unavailable",()=>{if(current())this.usePolling();});
  source.onerror=()=>{if(current())this.usePolling();};arm();
 }
 private cancel(id:string){
  const timer=this.timers.get(id);if(timer!==undefined)clearTimeout(timer);this.timers.delete(id);
  this.requests.get(id)?.abort();this.requests.delete(id);
 }
 private schedule(job:Job){
  if(!this.owner||this.source||!unfinished(job)||this.snapshot.errors[job.id]||this.timers.has(job.id)||this.requests.has(job.id))return;
  this.timers.set(job.id,setTimeout(()=>{this.timers.delete(job.id);void this.read(job.id);},1000));
 }
 retry(id:string){
  const job=this.snapshot.jobs.find(job=>job.id===id);if(!this.owner||!job||!unfinished(job))return;
  this.streamFailed=false;
  this.cancel(id);const errors={...this.snapshot.errors};delete errors[id];this.publish({...this.snapshot,errors});void this.read(id);
 }
 private async read(id:string){
  const controller=new AbortController(),epoch=this.epoch;this.requests.set(id,controller);
  const current=()=>this.owner!==null&&epoch===this.epoch&&this.requests.get(id)===controller;
  try{
   const response=await fetch(`/api/jobs/${encodeURIComponent(id)}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   if(!current())return;if(response.status===401){this.expire();return;}
   const payload=await response.json();if(!current())return;
   if(!response.ok||!isJob(payload.job)||payload.job.id!==id)throw new Error("Invalid task response");
   this.seed([payload.job]);
  }catch{if(current())this.publish({...this.snapshot,errors:{...this.snapshot.errors,[id]:"状态查询暂时失败，已保留上次记录。"}});}
  finally{
   if(current()){
    this.requests.delete(id);const job=this.snapshot.jobs.find(job=>job.id===id);if(job)this.schedule(job);
   }
  }
 }
}
