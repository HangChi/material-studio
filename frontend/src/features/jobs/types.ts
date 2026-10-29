export type Job = {
 id: string; templateId: string; templateTitle: string; status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
 stage: string | null; version: number; createdAt: string; updatedAt?: string; finishedAt?: string | null;
 resultUrl?: string | null; errorCode: string | null; errorMessage: string | null;
};
