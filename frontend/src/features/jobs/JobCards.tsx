"use client";
import { StudioIcon } from "../../components/StudioIcon";
import { WorkControls } from "./WorkControls";
import { JobEvents } from "./JobEvents";
import { JobActions } from "./JobActions";
import { ResultPreview } from "./ResultPreview";
import type { Job } from "./types";
import { unfinished } from "./JobTracker";
export function JobCards({jobs,errors,onRetry,headingLevel=3,onAccepted=()=>{},onExpire=()=>{},selected,onSelect}:{jobs:Job[];errors:Record<string,string>;onRetry:(id:string)=>void;headingLevel?:3|4;onAccepted?:(job:Job)=>void;onExpire?:()=>void;selected?:string[];onSelect?:(id:string)=>void}){
 const Heading=headingLevel===4?"h4":"h3";
 return <div className="history-cards">{jobs.map(job=><article className={`job-receipt record-${job.status.toLowerCase()} ${job.status==="SUCCEEDED"?"has-result":""}`} key={job.id}>
  <div className="job-visual">{job.status==="SUCCEEDED"&&job.resultUrl===`/api/jobs/${job.id}/result`?<ResultPreview key={job.resultUrl} url={job.resultUrl} title={job.templateTitle}/>:<div className="job-placeholder" aria-hidden="true"><StudioIcon name="history" /></div>}</div>
  <div className="job-copy">
   {onSelect&&<label className="work-selection"><input type="checkbox" aria-label={`选择作品 ${job.id}`} checked={selected?.includes(job.id)??false} onChange={()=>onSelect(job.id)}/>选择作品</label>}
   <div className="job-heading"><Heading>{job.displayName??job.templateTitle}{job.favorite?<span className="favorite-label"> · 已收藏</span>:null}</Heading><p className={`job-status status-${job.status.toLowerCase()}`} aria-live="polite">{job.errorCode==="JOB_CANCELLED"?"已取消":({QUEUED:"等待处理",RUNNING:"处理中",SUCCEEDED:"制作成功",FAILED:"制作失败"})[job.status]}</p></div>
   <div className="job-meta"><p className="receipt-time"><time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString("zh-CN")}</time></p>
    {job.stage&&<p>当前阶段：{({ASSET_CHECK:"素材检查",GENERATE:"图片合成",FINALIZE:"结果整理"})[job.stage as "ASSET_CHECK"|"GENERATE"|"FINALIZE"]??job.stage}</p>}
    {typeof job.attempt==="number"&&job.attempt>0&&<p className="tracking-note">{job.status==="QUEUED"?`已执行 ${job.attempt} / 3 次，等待下一次执行`:`第 ${job.attempt} / 3 次执行`}</p>}
   </div>
   <p className="task-number">任务编号：{job.id}</p>
   {job.status==="QUEUED"&&typeof job.queueAhead==="number"&&<p className="tracking-note">前方约 {job.queueAhead} 项任务，排队数量仅供参考。</p>}
   {job.status==="QUEUED"&&job.nextAttemptAt&&<p className="tracking-note">下一次执行时间：<time dateTime={job.nextAttemptAt}>{new Date(job.nextAttemptAt).toLocaleString("zh-CN")}</time></p>}
   {job.errorMessage&&<p className="execution-error">{job.errorMessage}</p>}
   {errors[job.id]?<div className="query-error"><p role="alert">{errors[job.id]}</p><button type="button" aria-label={`恢复查询 ${job.id}`} onClick={()=>onRetry(job.id)}>恢复查询</button></div>:unfinished(job)&&<p className="tracking-note">正在自动更新</p>}
   <JobActions job={job} onAccepted={onAccepted} onExpire={onExpire}/>
  </div>
  <div className="job-secondary"><WorkControls job={job} onUpdate={onAccepted} onExpire={onExpire}/><JobEvents id={job.id} version={job.version} onExpire={onExpire}/></div>
 </article>)}</div>;
}
