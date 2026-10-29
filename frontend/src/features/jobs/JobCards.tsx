"use client";
import { JobEvents } from "./JobEvents";
import { JobActions } from "./JobActions";
import { ResultPreview } from "./ResultPreview";
import type { Job } from "./types";
import { unfinished } from "./JobTracker";
export function JobCards({jobs,errors,onRetry,headingLevel=3,onAccepted=()=>{},onExpire=()=>{}}:{jobs:Job[];errors:Record<string,string>;onRetry:(id:string)=>void;headingLevel?:3|4;onAccepted?:(job:Job)=>void;onExpire?:()=>void}){
 const Heading=headingLevel===4?"h4":"h3";
 return <div className="history-cards">{jobs.map(job=><article className={`job-receipt ${job.status==="SUCCEEDED"?"has-result":""}`} key={job.id}>
  <div className="job-copy"><Heading>{job.templateTitle}</Heading><p className="task-number">任务编号：{job.id}</p>
   <p className={`job-status status-${job.status.toLowerCase()}`} aria-live="polite">{({QUEUED:"等待处理",RUNNING:"处理中",SUCCEEDED:"制作成功",FAILED:"制作失败"})[job.status]}</p>
   <p className="receipt-time"><time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString("zh-CN")}</time></p>
   {job.stage&&<p>当前阶段：{({ASSET_CHECK:"素材检查",GENERATE:"模拟生成",FINALIZE:"结果整理"})[job.stage as "ASSET_CHECK"|"GENERATE"|"FINALIZE"]??job.stage}</p>}
   {job.errorMessage&&<p className="execution-error">{job.errorMessage}</p>}
   {errors[job.id]?<div className="query-error"><p role="alert">{errors[job.id]}</p><button type="button" aria-label={`恢复查询 ${job.id}`} onClick={()=>onRetry(job.id)}>恢复查询</button></div>:unfinished(job)&&<p className="tracking-note">正在自动更新</p>}
   <JobEvents id={job.id} version={job.version} onExpire={onExpire}/>
   <JobActions job={job} onAccepted={onAccepted} onExpire={onExpire}/>
  </div>
  {job.status==="SUCCEEDED"&&job.resultUrl===`/api/jobs/${job.id}/result`&&<ResultPreview key={job.resultUrl} url={job.resultUrl} title={job.templateTitle}/>}
 </article>)}</div>;
}
