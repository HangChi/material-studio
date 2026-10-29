import { describe, expect, it, vi } from "vitest";
import { proxyTemplates } from "./api-proxy";

describe("template read proxy", () => {
  it("preserves the upstream status and filter without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: { code: "TEMPLATE_NOT_FOUND" } }, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await proxyTemplates(new Request("http://studio/api/templates/missing?categoryId=creative"), ["templates", "missing"]);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "TEMPLATE_NOT_FOUND" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://backend:8080/api/templates/missing?categoryId=creative");
  });
  it("streams image bytes and preserves PNG headers", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, { headers: { "content-type": "image/png", "x-content-type-options": "nosniff" } })));
    const response = await proxyTemplates(new Request("http://studio/api/demo/portrait.png"), ["demo", "portrait.png"]);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });
  it("turns connection failure into an actionable 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    const response = await proxyTemplates(new Request("http://studio/api/templates"), ["templates"]);
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("UPSTREAM_UNAVAILABLE");
  });
  it.each([["admin"], ["demo", ".."], ["demo", "secret.txt"], ["templates", "a/b"]])("rejects paths outside the template API: %j", async (...path) => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const response = await proxyTemplates(new Request("http://studio/api/invalid"), path);
    expect(response.status).toBe(404); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not proxy mutations", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const response = await proxyTemplates(new Request("http://studio/api/templates", { method: "POST" }), ["templates"]);
    expect(response.status).toBe(405); expect(fetchMock).not.toHaveBeenCalled();
  });
});

it("preserves admission backoff and keeps internal monitoring inaccessible",async()=>{
 const upstream=vi.fn().mockResolvedValue(Response.json({error:{code:"RATE_LIMITED",message:"稍后重试"}},{status:429,headers:{"Retry-After":"60"}}));vi.stubGlobal("fetch",upstream);
 const response=await proxyTemplates(new Request("http://studio/api/jobs",{method:"POST",body:"{}"}),["jobs"]);
 expect(response.status).toBe(429);expect(response.headers.get("retry-after")).toBe("60");
 for(const path of [["actuator","studio"],["studio"]])expect((await proxyTemplates(new Request("http://studio/api/"+path.join("/")),path)).status).toBe(404);
 expect(upstream).toHaveBeenCalledTimes(1);
});

it.each([["batches"],["batches","id","cancel"],["works","bulk"],["works","archive"],["account","register"],["account","login"],["account","recover"],["account","recovery-code"]])("forwards extended POST routes %j",async(...path)=>{const mocked=vi.fn().mockResolvedValue(Response.json({ok:true}));vi.stubGlobal("fetch",mocked);const response=await proxyTemplates(new Request("http://studio/api/"+path.join("/"),{method:"POST",body:"{}"}),path);expect(response.status).toBe(200);expect(mocked).toHaveBeenCalledTimes(1);});
it("keeps storage maintenance outside the browser allowlist",async()=>{const mocked=vi.fn();vi.stubGlobal("fetch",mocked);expect((await proxyTemplates(new Request("http://studio/api/actuator/storage"),["actuator","storage"])).status).toBe(404);expect(mocked).not.toHaveBeenCalled();});
