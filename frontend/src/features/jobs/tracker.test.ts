import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobTracker } from "./JobTracker";
import type { Job } from "./types";
const job=(id:string,overrides:Partial<Job>={}):Job=>({id,templateId:"demo-portrait",templateTitle:"肖像",status:"QUEUED",stage:null,version:0,createdAt:"2026-10-29T00:00:00Z",errorCode:null,errorMessage:null,...overrides});
function deferred(){let resolve!:(response:Response)=>void;return {promise:new Promise<Response>(done=>{resolve=done;}),resolve:(response:Response)=>resolve(response)};}
let tracker:JobTracker;
beforeEach(()=>{vi.useFakeTimers();tracker=new JobTracker();tracker.start("owner-a");});
afterEach(()=>{tracker.stop();vi.useRealTimers();});

describe("isolated automatic task tracking",()=>{
 it("tracks three tasks independently, pauses only failed queries and stops terminal polling",async()=>{
  let bReads=0;const fetcher=vi.fn(async(url:string)=>{
   if(url.endsWith("/a"))return Response.json({job:job("a",{status:"SUCCEEDED",stage:"FINALIZE",version:6,resultUrl:"/api/jobs/a/result"})});
   bReads++;return bReads===1?Response.json({error:{}},{status:503}):Response.json({job:job("b",{status:"FAILED",stage:"GENERATE",version:4,errorMessage:"模拟生成失败"})});
  });vi.stubGlobal("fetch",fetcher);
  tracker.seed([job("a"),job("b",{status:"RUNNING",stage:"ASSET_CHECK",version:1}),job("c",{status:"FAILED",version:2,errorMessage:"检查失败"})]);
  expect(tracker.getSnapshot().jobs).toHaveLength(3);await vi.advanceTimersByTimeAsync(1000);
  expect(tracker.getSnapshot().jobs.find(j=>j.id==="a")?.status).toBe("SUCCEEDED");
  expect(tracker.getSnapshot().jobs.find(j=>j.id==="b")?.status).toBe("RUNNING");expect(tracker.getSnapshot().errors.b).toBeTruthy();
  expect(tracker.getSnapshot().jobs.find(j=>j.id==="c")?.errorMessage).toBe("检查失败");
  await vi.advanceTimersByTimeAsync(2000);expect(fetcher).toHaveBeenCalledTimes(2);
  tracker.retry("b");await vi.advanceTimersByTimeAsync(0);expect(tracker.getSnapshot().jobs.find(j=>j.id==="b")?.status).toBe("FAILED");
  expect(tracker.getSnapshot().errors.b).toBeUndefined();await vi.advanceTimersByTimeAsync(2000);expect(fetcher).toHaveBeenCalledTimes(3);
 });
 it("ignores superseded responses even when abort is ignored and never regresses terminal state",async()=>{
  const old=deferred();const fetcher=vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(Response.json({job:job("a",{status:"SUCCEEDED",version:6,resultUrl:"/api/jobs/a/result"})}));vi.stubGlobal("fetch",fetcher);
  tracker.seed([job("a")]);await vi.advanceTimersByTimeAsync(1000);tracker.retry("a");await vi.advanceTimersByTimeAsync(0);
  old.resolve(Response.json({job:job("a",{status:"RUNNING",stage:"GENERATE",version:3})}));await vi.advanceTimersByTimeAsync(0);
  tracker.seed([job("a",{status:"RUNNING",stage:"FINALIZE",version:99})]);expect(tracker.getSnapshot().jobs[0].status).toBe("SUCCEEDED");
  await vi.advanceTimersByTimeAsync(2000);expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it("ignores lower and equal versions while continuing a live task without overlapping reads",async()=>{
  const pending=deferred();const fetcher=vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(Response.json({job:job("a",{status:"RUNNING",stage:"ASSET_CHECK",version:1})}));vi.stubGlobal("fetch",fetcher);
  tracker.seed([job("a",{status:"RUNNING",stage:"GENERATE",version:3})]);await vi.advanceTimersByTimeAsync(3000);expect(fetcher).toHaveBeenCalledTimes(1);
  pending.resolve(Response.json({job:job("a",{status:"RUNNING",stage:"ASSET_CHECK",version:1})}));await vi.advanceTimersByTimeAsync(0);
  tracker.seed([job("a",{status:"QUEUED",version:3})]);expect(tracker.getSnapshot().jobs[0].stage).toBe("GENERATE");
  await vi.advanceTimersByTimeAsync(1000);expect(fetcher).toHaveBeenCalledTimes(2);expect(tracker.getSnapshot().jobs[0].version).toBe(3);
 });
 it("aborts and invalidates old owner requests and cleans all timers on stop",async()=>{
  const pending=deferred();const fetcher=vi.fn().mockReturnValue(pending.promise);vi.stubGlobal("fetch",fetcher);
  tracker.seed([job("a")]);await vi.advanceTimersByTimeAsync(1000);const signal=fetcher.mock.calls[0][1].signal as AbortSignal;
  tracker.stop();expect(signal.aborted).toBe(true);tracker.start("owner-b");tracker.seed([job("b",{status:"FAILED",version:2})]);
  pending.resolve(Response.json({job:job("a",{status:"SUCCEEDED",version:6})}));await vi.advanceTimersByTimeAsync(2000);
  expect(tracker.getSnapshot().jobs.map(j=>j.id)).toEqual(["b"]);expect(fetcher).toHaveBeenCalledTimes(1);
  tracker.stop();await vi.advanceTimersByTimeAsync(2000);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it.each(["wrong-id","invalid-json","404"])("keeps the last task for a %s query failure",async failure=>{
  vi.stubGlobal("fetch",vi.fn(async()=>failure==="404"?Response.json({error:{}},{status:404}):failure==="invalid-json"?new Response("broken"):Response.json({job:job("another",{status:"SUCCEEDED",version:6})})));
  tracker.seed([job("a")]);await vi.advanceTimersByTimeAsync(1000);expect(tracker.getSnapshot().jobs[0].status).toBe("QUEUED");expect(tracker.getSnapshot().errors.a).toBeTruthy();
 });
 it("clears private snapshots and all tracking after an expired identity",async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json({error:{}},{status:401}));vi.stubGlobal("fetch",fetcher);tracker.seed([job("a"),job("b")]);
  await vi.advanceTimersByTimeAsync(1000);expect(tracker.getSnapshot().authExpired).toBe(true);expect(tracker.getSnapshot().jobs).toEqual([]);
  const calls=fetcher.mock.calls.length;await vi.advanceTimersByTimeAsync(2000);expect(fetcher).toHaveBeenCalledTimes(calls);
 });
});
