import { describe, expect, it, vi } from "vitest";
import { proxyTemplates } from "./api-proxy";

describe("identity and admission proxy", () => {
  it("forwards cookies and all Set-Cookie values without exposing owner headers", async () => {
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", "material_session=random; Path=/; HttpOnly; SameSite=Lax");
    headers.append("set-cookie", "other=value; Path=/; HttpOnly");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"user":{"id":"demo"}}', { headers }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await proxyTemplates(new Request("http://studio/api/session", { method: "POST", headers: { cookie: "material_session=old", origin: "http://studio", "x-owner-id": "forged" } }), ["session"]);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(options.headers).get("cookie")).toBe("material_session=old");
    expect(new Headers(options.headers).has("x-owner-id")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("streams multipart body with its original boundary and preserves Location", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "asset" }, { status: 201, headers: { Location: "/api/assets/asset/content" } }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("http://studio/api/assets", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test", origin: "http://studio" }, body: "--test\r\nimage-bytes\r\n--test--" });
    const response = await proxyTemplates(request, ["assets"]);
    expect(response.status).toBe(201); expect(response.headers.get("location")).toBe("/api/assets/asset/content");
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.body).toBe(request.body);
    expect(new Headers(options.headers).get("content-type")).toBe("multipart/form-data; boundary=test");
  });
  it("preserves deletion cookie on an empty 204 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "set-cookie": "material_session=; Max-Age=0; Path=/" } })));
    const response = await proxyTemplates(new Request("http://studio/api/session", { method: "DELETE" }), ["session"]);
    expect(response.status).toBe(204); expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it.each([["jobs"], ["jobs", "job-id"], ["assets", "asset-id", "content"]])("allows personal read path %j", async (...path) => {
    const mock = vi.fn().mockResolvedValue(Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })); vi.stubGlobal("fetch", mock);
    const response = await proxyTemplates(new Request("http://studio/api/"+path.join("/")), path);
    expect(response.status).toBe(401);
  });
  it("rejects cross-origin mutations before sending credentials upstream", async () => {
    const mock = vi.fn(); vi.stubGlobal("fetch", mock);
    const response = await proxyTemplates(new Request("http://studio/api/jobs", { method: "POST", headers: { origin: "https://other.example" }, body: "{}" }), ["jobs"]);
    expect(response.status).toBe(403); expect(mock).not.toHaveBeenCalled();
  });
  it("does not expand arbitrary write routes", async () => {
    const mock = vi.fn(); vi.stubGlobal("fetch", mock);
    expect((await proxyTemplates(new Request("http://studio/api/assets/id/content", { method: "DELETE" }), ["assets", "id", "content"])).status).toBe(405);
    expect(mock).not.toHaveBeenCalled();
  });
});
