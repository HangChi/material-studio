import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { History } from "./History";
const job=(id:string,extra:Record<string,unknown>={})=>({id,templateId:"demo-portrait",templateTitle:"日光肖像",status:"FAILED",stage:"GENERATE",version:4,createdAt:"2026-10-29T00:00:00Z",errorCode:"SIMULATED_FAILURE",errorMessage:"模拟生成失败",...extra});
function api(pages:(url:string)=>Response|Promise<Response>){return vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner-a"}}):url==="/api/jobs/active"?Response.json({items:[]}):pages(url));}
describe("personal history",()=>{
 it("offers a useful empty state without polling or inventing records",async()=>{
  const fetcher=api(()=>Response.json({items:[],nextCursor:null}));vi.stubGlobal("fetch",fetcher);render(<History/>);
  expect(await screen.findByText("还没有制作记录")).toBeVisible();expect(screen.getByRole("link",{name:"去挑选模板"})).toHaveAttribute("href","/");
 });
 it("restores success previews and unfinished jobs outside the first history page",async()=>{
  const fetcher=api(()=>Response.json({items:[job("success",{status:"SUCCEEDED",stage:"FINALIZE",version:6,errorCode:null,errorMessage:null,resultUrl:"/api/jobs/success/result"})],nextCursor:"success"}));
  fetcher.mockImplementation(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner-a"}}):url==="/api/jobs/active"?Response.json({items:[job("old-active",{status:"QUEUED",stage:null,version:0,errorMessage:null})]}):Response.json({items:[job("success",{status:"SUCCEEDED",stage:"FINALIZE",version:6,errorMessage:null,resultUrl:"/api/jobs/success/result"})],nextCursor:"success"}));
  vi.stubGlobal("fetch",fetcher);render(<History/>);expect(await screen.findByText("任务编号：old-active")).toBeVisible();
  expect(screen.getByRole("img",{name:"日光肖像制作结果"})).toHaveProperty("src",new URL("/api/jobs/success/result",window.location.href).href);expect(screen.getByText("等待处理")).toBeVisible();
 });
 it("retains cards and the cursor on a page error and retries without duplicates",async()=>{
  let more=0;const fetcher=api(url=>{
   if(!url.includes("cursor="))return Response.json({items:[job("first")],nextCursor:"first"});
   more++;return more===1?Response.json({error:{}},{status:503}):Response.json({items:[job("first"),job("second")],nextCursor:null});
  });vi.stubGlobal("fetch",fetcher);render(<History/>);await screen.findByText("任务编号：first");
  fireEvent.click(screen.getByRole("button",{name:"加载更多"}));expect(await screen.findByText(/记录查询失败/)).toBeVisible();expect(screen.getByText("任务编号：first")).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"加载更多"}));expect(await screen.findByText("任务编号：second")).toBeVisible();expect(screen.getAllByText("任务编号：first")).toHaveLength(1);expect(more).toBe(2);
 });
 it("recovers an initial query error without presenting it as a failed production task",async()=>{
  let reads=0;vi.stubGlobal("fetch",api(()=>++reads===1?Response.json({error:{}},{status:503}):Response.json({items:[job("recovered")],nextCursor:null})));
  render(<History/>);expect(await screen.findByText(/记录查询失败/)).toBeVisible();expect(screen.queryByText("制作失败")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"刷新记录"}));expect(await screen.findByText("任务编号：recovered")).toBeVisible();
 });
 it("ignores a late page from the old visitor after switching identity",async()=>{
  let create=0;let resolve!:(r:Response)=>void;const pending=new Promise<Response>(r=>{resolve=r;});
  vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
   if(url==="/api/session")return options?.method==="DELETE"?new Response(null,{status:204}):Response.json({user:{id:++create===1?"owner-a":"owner-b"}});
   if(url==="/api/jobs/active")return Response.json({items:[]});
   if(url.includes("cursor="))return pending;
   return Response.json({items:create===1?[job("old")]:[],nextCursor:create===1?"old":null});
  }));render(<History/>);await screen.findByText("任务编号：old");fireEvent.click(screen.getByRole("button",{name:"加载更多"}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"正在加载…"})).toBeDisabled());fireEvent.click(screen.getByRole("button",{name:"切换为新访客"}));
  expect(await screen.findByText("还没有制作记录")).toBeVisible();await act(async()=>{resolve(Response.json({items:[job("late-old")],nextCursor:null}));});
  expect(screen.queryByText("任务编号：old")).not.toBeInTheDocument();expect(screen.queryByText("任务编号：late-old")).not.toBeInTheDocument();
 });
});

it("refreshes an exhausted history onto the newest pagination chain without losing intermediate records",async()=>{
 let firstReads=0;
 const fetcher=api(url=>{
  if(url.includes("cursor="))return Response.json({items:[...Array.from({length:5},(_,i)=>job(`new-${20+i}`)),job("old")],nextCursor:null});
  firstReads++;return firstReads===1?Response.json({items:[job("old")],nextCursor:null}):Response.json({items:Array.from({length:20},(_,i)=>job(`new-${i}`)),nextCursor:"new-19"});
 });vi.stubGlobal("fetch",fetcher);render(<History/>);await screen.findByText("任务编号：old");
 fireEvent.click(screen.getByRole("button",{name:"刷新记录"}));await screen.findByText("任务编号：new-0");
 fireEvent.click(screen.getByRole("button",{name:"加载更多"}));expect(await screen.findByText("任务编号：new-24")).toBeVisible();
 expect(screen.getAllByRole("article")).toHaveLength(26);expect(screen.getAllByText("任务编号：old")).toHaveLength(1);
 expect(fetcher).toHaveBeenCalledWith("/api/jobs?limit=20&cursor=new-19",expect.anything());
});
it("replaces an existing cursor on refresh rather than skipping newly inserted pages",async()=>{
 let reads=0;const fetcher=api(()=>Response.json(++reads===1?{items:[job("old-head")],nextCursor:"old-anchor"}:reads===2?{items:[job("new-head")],nextCursor:"new-anchor"}:{items:[job("gap")],nextCursor:null}));
 vi.stubGlobal("fetch",fetcher);render(<History/>);await screen.findByText("任务编号：old-head");
 fireEvent.click(screen.getByRole("button",{name:"刷新记录"}));await screen.findByText("任务编号：new-head");fireEvent.click(screen.getByRole("button",{name:"加载更多"}));await screen.findByText("任务编号：gap");
 expect(fetcher).toHaveBeenCalledWith("/api/jobs?limit=20&cursor=new-anchor",expect.anything());expect(screen.getByText("任务编号：old-head")).toBeVisible();
});
it("retains the previous cursor and snapshots when refreshing the first page fails",async()=>{
 let reads=0;const fetcher=api(()=>++reads===1?Response.json({items:[job("old")],nextCursor:"old-anchor"}):reads===2?Response.json({error:{}},{status:503}):Response.json({items:[job("older")],nextCursor:null}));
 vi.stubGlobal("fetch",fetcher);render(<History/>);await screen.findByText("任务编号：old");fireEvent.click(screen.getByRole("button",{name:"刷新记录"}));
 await screen.findByText(/记录查询失败/);expect(screen.getByText("任务编号：old")).toBeVisible();fireEvent.click(screen.getByRole("button",{name:"加载更多"}));await screen.findByText("任务编号：older");
 expect(fetcher).toHaveBeenCalledWith("/api/jobs?limit=20&cursor=old-anchor",expect.anything());
});
