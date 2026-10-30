import {act,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {Batches} from "./Batches";
vi.mock("../assets/UploadSlots",()=>({UploadSlots:({onChange}:{onChange:(ids:string[])=>void})=><button onClick={()=>onChange(["asset-x"])}>准备素材</button>}));
const template={id:"demo-portrait",title:"肖像",requiredImageCount:1,acceptedMimeTypes:["image/png"],maxFileSizeBytes:5242880};
const job={id:"job-a",templateId:"demo-portrait",templateTitle:"肖像",status:"FAILED",stage:"GENERATE",version:4,createdAt:"2026-10-30T00:00:00Z",errorMessage:"模拟失败"};
it("restores a batch and its independent task snapshots",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):url==="/api/templates"?Response.json({items:[template]}):Response.json({items:[{id:"batch-a",name:"一组作品",items:[job]}],nextCursor:null})));
 render(<Batches/>);expect(await screen.findByRole("heading",{name:"一组作品"})).toBeVisible();expect(screen.getByText("任务编号：job-a")).toBeVisible();expect(screen.getByText("模拟失败")).toBeVisible();
});
it("isolates item readiness and safely retries the same batch operation",async()=>{
 const posted:{key:string;body:string}[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});if(url==="/api/templates")return Response.json({items:[template]});
  if(options?.method==="POST"){posted.push({key:(options.headers as Record<string,string>)["Idempotency-Key"],body:options.body as string});return posted.length===1?Response.json({error:{}},{status:503}):Response.json({batch:{id:"accepted",name:"新批次",items:[job]}},{status:202});}
  return Response.json({items:[],nextCursor:null});
 }));render(<Batches/>);await screen.findByRole("button",{name:"准备素材"});fireEvent.click(screen.getByRole("button",{name:"增加制作项"}));
 fireEvent.click(screen.getAllByRole("button",{name:"准备素材"})[0]);expect(screen.getByRole("button",{name:"提交批次"})).toBeDisabled();fireEvent.click(screen.getAllByRole("button",{name:"准备素材"})[1]);
 fireEvent.click(screen.getByRole("button",{name:"提交批次"}));fireEvent.click(await screen.findByRole("button",{name:"安全重试批次"}));
 await waitFor(()=>expect(posted).toHaveLength(2));expect(posted[0]).toEqual(posted[1]);expect(JSON.parse(posted[0].body).items).toHaveLength(2);expect(await screen.findByRole("heading",{name:"新批次"})).toBeVisible();
});
it("keeps a newly accepted batch when an older list request finishes, then refreshes from the first page",async()=>{
 let finishList!:(response:Response)=>void;
 const staleList=new Promise<Response>(resolve=>{finishList=resolve;});
 let reads=0;
 const accepted={id:"accepted",name:"并发受理的新批次",items:[job]};
 vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(url==="/api/templates")return Response.json({items:[template]});
  if(options?.method==="POST")return Response.json({batch:accepted},{status:202});
  reads++;
  if(reads===1)return staleList;
  if(reads===2)return Response.json({items:[accepted,{id:"old-page",name:"下一页记录",items:[]}],nextCursor:null});
  return Response.json({items:[accepted],nextCursor:null});
 }));
 render(<Batches/>);
 fireEvent.click(await screen.findByRole("button",{name:"准备素材"}));
 fireEvent.click(screen.getByRole("button",{name:"提交批次"}));
 expect(await screen.findByRole("heading",{name:accepted.name})).toBeVisible();
 await act(async()=>{finishList(Response.json({items:[],nextCursor:"old-cursor"}));await staleList;});
 expect(screen.getByRole("heading",{name:accepted.name})).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"加载更多批次"}));
 expect(await screen.findByRole("heading",{name:"下一页记录"})).toBeVisible();
 expect(screen.getAllByRole("heading",{name:accepted.name})).toHaveLength(1);
 fireEvent.click(screen.getByRole("button",{name:"刷新批次"}));
 await waitFor(()=>expect(screen.queryByRole("heading",{name:"下一页记录"})).not.toBeInTheDocument());
 expect(screen.getByRole("heading",{name:accepted.name})).toBeVisible();
});
