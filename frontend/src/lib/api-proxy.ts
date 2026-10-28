const allowed = /^(template-categories|templates(?:\/[a-zA-Z0-9_-]+)?|demo\/[a-z0-9-]+\.png)$/;

export async function proxyTemplates(request: Request, path: string[]): Promise<Response> {
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET" } });
  if (path.some(part => part.includes("/") || part === "..") || !allowed.test(path.join("/"))) {
    return new Response(null, { status: 404 });
  }
  const url = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, process.env.JAVA_API_BASE_URL ?? "http://backend:8080");
  url.search = new URL(request.url).search;
  try {
    const upstream = await fetch(url, { cache: "no-store", signal: request.signal });
    const headers = new Headers({ "cache-control": "no-store" });
    for (const name of ["content-type", "x-content-type-options"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "暂时无法加载模板，请重试" } }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
