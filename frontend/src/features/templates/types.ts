export type Category = { id: string; name: string };
export type Template = {
  id: string; title: string; categoryId: string; coverUrl: string; description: string;
  requiredImageCount: number; acceptedMimeTypes: string[]; maxFileSizeBytes: number;
};
export async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}
