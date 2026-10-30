function methodsFor(path: string[]): string[] | null {
  if (path.some(part => !/^[a-zA-Z0-9_.-]+$/.test(part) || part === ".." || part === ".")) return null;
  const joined = path.join("/");
  if (/^(template-categories|templates(?:\/[a-zA-Z0-9_-]+)?|demo\/[a-z0-9-]+\.png)$/.test(joined)) return ["GET"];
  if (/^account\/(register|login|recover|recovery-code)$/.test(joined)) return ["POST"];
  if (joined === "session") return ["GET", "POST", "DELETE"];
  if (joined === "assets") return ["GET", "POST"];
  if (/^assets\/[a-zA-Z0-9_-]+\/content$/.test(joined)) return ["GET"];
  if (joined === "batches") return ["GET", "POST"];
  if (/^batches\/[a-zA-Z0-9_-]+$/.test(joined)) return ["GET"];
  if (/^batches\/[a-zA-Z0-9_-]+\/cancel$/.test(joined)) return ["POST"];
  if (/^works\/(bulk|archive)$/.test(joined)) return ["POST"];
  if (/^jobs\/[a-zA-Z0-9_-]+\/tags$/.test(joined)) return ["GET"];
  if (joined === "jobs") return ["GET", "POST"];
  if (joined === "jobs/stream") return ["GET"];
  if (/^jobs\/[a-zA-Z0-9_-]+\/library$/.test(joined)) return ["PATCH"];
  if (/^jobs\/[a-zA-Z0-9_-]+\/(recreate|cancel)$/.test(joined)) return ["POST"];
  if (/^jobs\/[a-zA-Z0-9_-]+(?:\/(?:events|result|recipe|download))?$/.test(joined)) return ["GET"];
  return null;
}

export async function proxyTemplates(request: Request, path: string[]): Promise<Response> {
  const methods = methodsFor(path);
  if (!methods) return new Response(null, { status: 404 });
  if (!methods.includes(request.method)) return new Response(null, { status: 405, headers: { Allow: methods.join(", ") } });
  const source = new URL(request.url);
  const origin = request.headers.get("origin");
  // Next standalone may construct request.url from its internal listen address.
  const publicOrigin = new URL(process.env.APP_ORIGIN || `${source.protocol}//${request.headers.get("host") ?? source.host}`).origin;
  if (request.method !== "GET" && origin && origin !== publicOrigin) {
    return Response.json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "请求来源不正确" } }, { status: 403 });
  }
  const url = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, process.env.JAVA_API_BASE_URL ?? "http://backend:8080");
  url.search = source.search;
  const upstreamHeaders = new Headers();
  for (const name of ["cookie", "content-type", "accept", "idempotency-key"]) {
    const value = request.headers.get(name); if (value) upstreamHeaders.set(name, value);
  }
  const options: RequestInit & { duplex?: "half" } = {
    method: request.method, headers: upstreamHeaders, cache: "no-store", redirect: "manual", signal: request.signal,
  };
  if (request.method !== "GET" && request.body) { options.body = request.body; options.duplex = "half"; }
  try {
    const upstream = await fetch(url, options);
    const headers = new Headers({ "cache-control": "no-store" });
    for (const name of ["content-type", "x-content-type-options", "location", "content-disposition", "retry-after", "x-accel-buffering"]) {
      const value = upstream.headers.get(name); if (value) headers.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) headers.append("set-cookie", cookie);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "服务暂时不可用，请重试；提交结果请先核对记录" } }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
