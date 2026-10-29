import { expect,it,vi } from "vitest";
import * as route from "../app/api/[...path]/route";
it("exposes the work management PATCH method through the actual Next route",async()=>{
 expect(route).toHaveProperty("PATCH",expect.any(Function));
 const handler=(route as Record<string,unknown>).PATCH as typeof route.GET;
 const fetcher=vi.fn().mockResolvedValue(Response.json({job:{id:"one"}}));vi.stubGlobal("fetch",fetcher);
 const response=await handler(new Request("http://studio/api/jobs/one/library",{method:"PATCH",headers:{"content-type":"application/json",origin:"http://studio"},body:JSON.stringify({favorite:true})}),{params:Promise.resolve({path:["jobs","one","library"]})});
 expect(response.status).toBe(200);expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
});
