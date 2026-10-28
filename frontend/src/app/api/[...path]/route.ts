import { proxyTemplates } from "../../../lib/api-proxy";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyTemplates(request, path);
}

export const POST = GET;
export const DELETE = GET;
