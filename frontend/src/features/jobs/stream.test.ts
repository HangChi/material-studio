import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {JobTracker} from "./JobTracker";
import type {Job} from "./types";
const job=(id:string,changes:Partial<Job>={}):Job=>({id,templateId:"demo-portrait",templateTitle:"肖像",status:"QUEUED",stage:null,version:0,createdAt:"2026-10-30T00:00:00Z",errorCode:null,errorMessage:null,...changes});
class Source {
 static instances:Source[]=[];closed=false;onerror:((event:Event)=>void)|null=null;
 private listeners=new Map<string,Array<(event:MessageEvent)=>void>>();
 constructor(readonly url:string){Source.instances.push(this);}
 addEventListener(name:string,listener:(event:MessageEvent)=>void){this.listeners.set(name,[...(this.listeners.get(name)??[]),listener]);}
 close(){this.closed=true;}
 emit(name:string,value:unknown){this.raw(name,JSON.stringify(value));}
 raw(name:string,value:string){for(const listener of this.listeners.get(name)??[])listener(new MessageEvent(name,{data:value}));}
}
let tracker:JobTracker;
beforeEach(()=>{vi.useFakeTimers();Source.instances=[];vi.stubGlobal("EventSource",Source);tracker=new JobTracker();tracker.start("one");});
afterEach(()=>{tracker.stop();vi.useRealTimers();vi.unstubAllGlobals();});
function source(){expect(Source.instances).toHaveLength(1);return Source.instances[0];}
it("uses one source for two tasks, isolates execution failure, rejects old versions and stops at terminal",async()=>{
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);tracker.seed([job("a"),job("b")]);const first=source();expect(first.url).toContain("/api/jobs/stream?ids=");await vi.advanceTimersByTimeAsync(1000);expect(fetcher).not.toHaveBeenCalled();
 first.emit("jobs",{items:[job("a",{status:"FAILED",version:2,errorMessage:"制作失败"}),job("b",{status:"RUNNING",version:2})]});expect(first.closed).toBe(true);expect(Source.instances).toHaveLength(2);const second=Source.instances[1];
 second.emit("jobs",{items:[job("b",{status:"RUNNING",version:1})]});expect(tracker.getSnapshot().jobs.find(j=>j.id==="b")?.version).toBe(2);
 second.emit("jobs",{items:[job("b",{status:"SUCCEEDED",version:3})]});expect(second.closed).toBe(true);second.emit("jobs",{items:[job("b",{status:"RUNNING",version:99})]});
 expect(tracker.getSnapshot().jobs.find(j=>j.id==="a")?.status).toBe("FAILED");expect(tracker.getSnapshot().jobs.find(j=>j.id==="b")?.status).toBe("SUCCEEDED");await vi.advanceTimersByTimeAsync(30000);expect(fetcher).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it("immediately resyncs on disconnection and preserves independent polling errors and manual recovery",async()=>{
 let a=0;const fetcher=vi.fn(async(url:string)=>url.endsWith("/a")?Response.json({job:job("a",{status:++a===1?"RUNNING":"SUCCEEDED",version:a})}):Response.json({error:{}},{status:503}));vi.stubGlobal("fetch",fetcher);
 tracker.seed([job("a"),job("b")]);const first=source();first.onerror?.(new Event("error"));await vi.advanceTimersByTimeAsync(0);expect(first.closed).toBe(true);expect(fetcher).toHaveBeenCalledTimes(2);expect(tracker.getSnapshot().errors.b).toBeTruthy();expect(tracker.getSnapshot().jobs.find(j=>j.id==="b")?.status).toBe("QUEUED");
 first.emit("jobs",{items:[job("a",{version:99}),job("b",{version:99})]});await vi.advanceTimersByTimeAsync(1000);expect(fetcher).toHaveBeenCalledTimes(3);expect(tracker.getSnapshot().jobs.find(j=>j.id==="a")?.status).toBe("SUCCEEDED");
 fetcher.mockResolvedValueOnce(Response.json({job:job("b",{status:"SUCCEEDED",version:4})}));tracker.retry("b");await vi.advanceTimersByTimeAsync(0);expect(tracker.getSnapshot().errors.b).toBeUndefined();expect(tracker.getSnapshot().jobs.find(j=>j.id==="b")?.status).toBe("SUCCEEDED");
});
it("closes old identity sources and clears all private state when the current stream expires",()=>{
 tracker.seed([job("a")]);const old=source();tracker.start("two");expect(old.closed).toBe(true);tracker.seed([job("b")]);const current=Source.instances[1];old.emit("expired",{});old.emit("jobs",{items:[job("a",{version:99})]});expect(tracker.getSnapshot().authExpired).toBe(false);expect(tracker.getSnapshot().jobs.map(j=>j.id)).toEqual(["b"]);
 current.emit("expired",{});expect(current.closed).toBe(true);expect(tracker.getSnapshot()).toEqual({jobs:[],errors:{},authExpired:true});expect(vi.getTimerCount()).toBe(0);
});
it.each(["foreign","malformed"])("falls back without accepting %s stream data",async kind=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({job:job("a",{status:"SUCCEEDED",version:2})}));vi.stubGlobal("fetch",fetcher);tracker.seed([job("a")]);const first=source();if(kind==="foreign")first.emit("jobs",{items:[job("other",{version:99})]});else first.raw("jobs","not json");await vi.advanceTimersByTimeAsync(0);expect(first.closed).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1);expect(tracker.getSnapshot().jobs.map(j=>j.id)).toEqual(["a"]);
});
it("resets the silence watchdog on heartbeat and falls back after twenty quiet seconds",async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({job:job("a",{status:"SUCCEEDED",version:2})}));vi.stubGlobal("fetch",fetcher);tracker.seed([job("a")]);const first=source();await vi.advanceTimersByTimeAsync(19000);expect(fetcher).not.toHaveBeenCalled();first.emit("heartbeat",{kind:"keepalive"});await vi.advanceTimersByTimeAsync(19000);expect(fetcher).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1000);expect(first.closed).toBe(true);expect(fetcher).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});
it("keeps task tracking usable when stream construction is unavailable",async()=>{
 vi.stubGlobal("EventSource",class {constructor(){throw new Error("blocked stream");}});const fetcher=vi.fn().mockResolvedValue(Response.json({job:job("a",{status:"SUCCEEDED",version:2})}));vi.stubGlobal("fetch",fetcher);tracker.seed([job("a")]);await vi.advanceTimersByTimeAsync(0);expect(fetcher).toHaveBeenCalledTimes(1);expect(tracker.getSnapshot().jobs[0].status).toBe("SUCCEEDED");
});
