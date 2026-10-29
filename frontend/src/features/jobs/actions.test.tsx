import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { JobActions } from "./JobActions";
import type { Job } from "./types";
const job:Job={id:"original",templateId:"demo-portrait",templateTitle:"肖像",status:"FAILED",stage:"GENERATE",version:4,createdAt:"2026-10-29T00:00:00Z",errorCode:"SIMULATED_FAILURE",errorMessage:"失败"};
beforeEach(()=>sessionStorage.clear());
it("retries a lost recreate response using the same operation and reports the new independent task",async()=>{
 const calls:RequestInit[]=[];const accepted=vi.fn(),expire=vi.fn();
 vi.stubGlobal("fetch",vi.fn(async(_url:string,options:RequestInit)=>{calls.push(options);if(calls.length===1)throw new Error("lost");return Response.json({job:{...job,id:"new",status:"QUEUED",stage:null,version:0}},{status:202});}));
 const view=render(<JobActions job={job} onAccepted={accepted} onExpire={expire}/>);
 fireEvent.click(screen.getByRole("button",{name:"重试失败任务 original"}));await screen.findByText(/结果尚未确认/);view.unmount();
 render(<JobActions job={job} onAccepted={accepted} onExpire={expire}/>);
 fireEvent.click(await screen.findByRole("button",{name:"安全重试重新制作 original"}));
 await waitFor(()=>expect(accepted).toHaveBeenCalledWith(expect.objectContaining({id:"new",status:"QUEUED"})));
 expect(new Headers(calls[0].headers).get("Idempotency-Key")).toBe(new Headers(calls[1].headers).get("Idempotency-Key"));expect(expire).not.toHaveBeenCalled();
});
it("shows a private download error without starting a new task and stops after unmount",async()=>{
 let resolve!:(r:Response)=>void;const fetcher=vi.fn((...args:[string,RequestInit])=>{void args;return new Promise<Response>(r=>{resolve=r;});});vi.stubGlobal("fetch",fetcher);
 const accepted=vi.fn();const view=render(<JobActions job={{...job,status:"SUCCEEDED",resultUrl:"/api/jobs/original/result"}} onAccepted={accepted} onExpire={()=>{}}/>);
 fireEvent.click(screen.getByRole("button",{name:"下载 PNG original"}));
 await act(async()=>resolve(Response.json({error:{message:"结果文件暂不可用"}},{status:404})));
 expect(await screen.findByText("结果文件暂不可用")).toBeVisible();expect(accepted).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"下载 PNG original"}));view.unmount();expect(fetcher.mock.calls[1][1].signal?.aborted).toBe(true);
});
it("cancels an active task and reports the persisted cancelled snapshot",async()=>{
 const accepted=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>Response.json({job:{...job,status:"FAILED",errorCode:"JOB_CANCELLED",errorMessage:"制作已取消",version:5}})));
 render(<JobActions job={{...job,status:"RUNNING",errorCode:null}} onAccepted={accepted} onExpire={()=>{}}/>);
 fireEvent.click(screen.getByRole("button",{name:"取消任务 original"}));await waitFor(()=>expect(accepted).toHaveBeenCalledWith(expect.objectContaining({errorCode:"JOB_CANCELLED"})));
});
