import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionForm } from "./SubmissionForm";
import type { UploadSlotsProps } from "../assets/UploadSlots";
vi.mock("../assets/UploadSlots",()=>({UploadSlots:({onChange,disabled}:UploadSlotsProps)=><button type="button" disabled={disabled} onClick={()=>onChange(["asset-1"])}>准备测试素材</button>}));
const template={id:"demo-portrait",title:"日光肖像",description:"样张",categoryId:"creative",coverUrl:"/cover.png",requiredImageCount:1,acceptedMimeTypes:["image/png"],maxFileSizeBytes:5242880};
const job={id:"job-1",templateId:"demo-portrait",templateTitle:"日光肖像",status:"QUEUED",stage:null,version:0,createdAt:"2026-10-29T02:00:00Z",errorCode:null,errorMessage:null};
function api(){return vi.fn(async(url:string,options?:RequestInit)=>{
 if(url==="/api/session")return Response.json({user:{id:"user-1"}});
 if(url==="/api/jobs"&&options?.method==="POST")return Response.json({job},{status:202});
 return Response.json({items:[]});
});}
async function ready(){await waitFor(()=>expect(screen.getByRole("button",{name:"准备测试素材"})).toBeEnabled());}
async function prepare(){await ready();fireEvent.click(screen.getByRole("button",{name:"准备测试素材"}));}

describe("submission admission form",()=>{
 it("requires an initialized identity and complete uploaded assets",async()=>{
  let resolve!:(r:Response)=>void;vi.stubGlobal("fetch",vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));
  render(<SubmissionForm template={template}/>);
  expect(screen.queryByRole("button",{name:"准备测试素材"})).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"提交制作"})).not.toBeInTheDocument();
  await act(async()=>{resolve(Response.json({user:{id:"user-1"}}));});await ready();
  expect(screen.getByRole("button",{name:"提交制作"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"准备测试素材"}));expect(screen.getByRole("button",{name:"提交制作"})).toBeEnabled();
 });
 it("recovers failed identity initialization",async()=>{
  const mock=vi.fn().mockRejectedValue(new Error("offline"));vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);
  expect(await screen.findByRole("button",{name:"重新建立访客身份"})).toBeEnabled();
  mock.mockImplementation(api());fireEvent.click(screen.getByRole("button",{name:"重新建立访客身份"}));await ready();
 });
 it("prevents duplicate clicks, displays accepted tasks and permits another independent task",async()=>{
  let resolve!:(r:Response)=>void;let sequence=0;const mock=api();
  mock.mockImplementation(async(url:string,options?:RequestInit)=>{
   if(url==="/api/session")return Response.json({user:{id:"user-1"}});
   if(options?.method==="POST"){sequence++;if(sequence===1)return new Promise<Response>(r=>{resolve=r;});return Response.json({job:{...job,id:"job-2"}},{status:202});}
   return Response.json({items:[]});
  });vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await prepare();
  const submit=screen.getByRole("button",{name:"提交制作"});fireEvent.click(submit);fireEvent.click(submit);
  expect(sequence).toBe(1);expect(screen.getByRole("button",{name:"提交中…"})).toBeDisabled();
  await act(async()=>{resolve(Response.json({job},{status:202}));});expect(await screen.findByText("任务编号：job-1")).toBeVisible();
  expect(screen.getByText("等待处理")).toBeVisible();expect(screen.getByRole("button",{name:"提交制作"})).toBeDisabled();
  await prepare();fireEvent.click(screen.getByRole("button",{name:"提交制作"}));expect(await screen.findByText("任务编号：job-2")).toBeVisible();
  expect(screen.getByText("任务编号：job-1")).toBeVisible();
 });
 it("shows a recorded dispatch failure as a task rather than a failed submission",async()=>{
  const mock=api();mock.mockImplementation(async(url:string)=>url==="/api/session"?Response.json({user:{id:"user-1"}}):Response.json({job:{...job,status:"FAILED",errorCode:"PROCESSOR_NOT_AVAILABLE",errorMessage:"制作服务暂不可用，任务未开始处理"}},{status:202}));
  vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await prepare();fireEvent.click(screen.getByRole("button",{name:"提交制作"}));
  expect(await screen.findByText("任务编号：job-1")).toBeVisible();expect(screen.getByText("制作失败")).toBeVisible();expect(screen.getByText("制作服务暂不可用，任务未开始处理")).toBeVisible();
 });
 it("allows correcting a rejected request without inventing a task",async()=>{
  const mock=api();mock.mockImplementation(async(url:string)=>url==="/api/session"?Response.json({user:{id:"user-1"}}):Response.json({error:{code:"VALIDATION_FAILED",message:"素材数量不符"}},{status:422}));
  vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await prepare();fireEvent.click(screen.getByRole("button",{name:"提交制作"}));
  expect(await screen.findByText("素材数量不符")).toBeVisible();expect(screen.getByRole("button",{name:"提交制作"})).toBeEnabled();expect(screen.queryByText(/任务编号/)).not.toBeInTheDocument();
 });
});

describe("uncertain admission reconciliation",()=>{
 it.each(["network","server","malformed"])("does not unlock or resubmit an uncertain %s response",async failure=>{
  let posts=0;const mock=api();mock.mockImplementation(async(url:string,options?:RequestInit)=>{
   if(url==="/api/session")return Response.json({user:{id:"user-1"}});
   if(options?.method==="POST"){posts++;if(failure==="network")throw new Error("response lost");if(failure==="server")return Response.json({error:{message:"unavailable"}},{status:503});return Response.json({},{status:202});}
   return Response.json({items:[]});
  });vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await prepare();fireEvent.click(screen.getByRole("button",{name:"提交制作"}));
  expect(await screen.findByText(/提交结果尚未确认/)).toBeVisible();expect(screen.getByRole("button",{name:"提交制作"})).toBeDisabled();
  expect(posts).toBe(1);expect(screen.getByRole("button",{name:"查看已受理任务"})).toBeEnabled();
 });
 it("requires successful manual reconciliation and explicit confirmation before another submission",async()=>{
  let posts=0,reads=0;const mock=api();mock.mockImplementation(async(url:string,options?:RequestInit)=>{
   if(url==="/api/session")return Response.json({user:{id:"user-1"}});
   if(options?.method==="POST"){posts++;throw new Error("response lost");}
   reads++;return reads===1?Response.json({error:{message:"offline"}},{status:503}):Response.json({items:[job]});
  });vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await prepare();fireEvent.click(screen.getByRole("button",{name:"提交制作"}));
  await screen.findByText(/提交结果尚未确认/);fireEvent.click(screen.getByRole("button",{name:"查看已受理任务"}));
  expect(await screen.findByText(/核对失败/)).toBeVisible();expect(screen.queryByRole("button",{name:"已核对，继续准备"})).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"提交制作"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"查看已受理任务"}));
  expect(await screen.findByText("任务编号：job-1")).toBeVisible();expect(screen.getByRole("button",{name:"提交制作"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"已核对，继续准备"}));await prepare();expect(screen.getByRole("button",{name:"提交制作"})).toBeEnabled();expect(posts).toBe(1);
 });
});

describe("pipeline snapshots",()=>{
 it("shows a task stage and its protected success image after manual reconciliation",async()=>{
  const mock=api();mock.mockImplementation(async(url:string)=>url==="/api/session"?Response.json({user:{id:"user-1"}}):Response.json({items:[{...job,id:"running",status:"RUNNING",stage:"GENERATE"},{...job,id:"finished",status:"SUCCEEDED",stage:"FINALIZE",resultUrl:"/api/jobs/finished/result"}]}));
  vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await ready();fireEvent.click(screen.getByRole("button",{name:"查看已受理任务"}));
  expect(await screen.findByText("当前阶段：模拟生成")).toBeVisible();
  expect(screen.getByRole("img",{name:"日光肖像制作结果"})).toHaveAttribute("src","/api/jobs/finished/result");
  expect(screen.getByText("制作成功")).toBeVisible();expect(screen.getByText("处理中")).toBeVisible();
 });
 it("keeps the last running snapshot when a later manual query fails",async()=>{
  let reads=0;const mock=api();mock.mockImplementation(async(url:string)=>{
   if(url==="/api/session")return Response.json({user:{id:"user-1"}});
   reads++;return reads===1?Response.json({items:[{...job,status:"RUNNING",stage:"ASSET_CHECK"}]}):Response.json({error:{}},{status:503});
  });vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await ready();fireEvent.click(screen.getByRole("button",{name:"查看已受理任务"}));
  expect(await screen.findByText("当前阶段：素材检查")).toBeVisible();fireEvent.click(screen.getByRole("button",{name:"查看已受理任务"}));
  expect(await screen.findByText(/核对失败/)).toBeVisible();expect(screen.getByText("处理中")).toBeVisible();expect(screen.queryByText("制作失败")).not.toBeInTheDocument();
 });
});

it("automatically tracks each accepted task to a terminal result without another manual lookup",async()=>{
 const mock=api();mock.mockImplementation(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"user-1"}});
  if(options?.method==="POST")return Response.json({job},{status:202});
  if(url==="/api/jobs/job-1")return Response.json({job:{...job,status:"SUCCEEDED",stage:"FINALIZE",version:6,resultUrl:"/api/jobs/job-1/result"}});
  return Response.json({items:[],nextCursor:null});
 });vi.stubGlobal("fetch",mock);render(<SubmissionForm template={template}/>);await prepare();fireEvent.click(screen.getByRole("button",{name:"提交制作"}));
 expect(await screen.findByText("任务编号：job-1")).toBeVisible();expect(await screen.findByRole("img",{name:"日光肖像制作结果"},{timeout:3000})).toHaveAttribute("src","/api/jobs/job-1/result");
});
