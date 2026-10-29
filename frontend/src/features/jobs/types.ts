export type Job = {
 queueAhead?:number|null;attempt?:number;nextAttemptAt?:string|null;
 displayName?:string|null;favorite?:boolean;hidden?:boolean;
 id: string; templateId: string; templateTitle: string; status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
 stage: string | null; version: number; createdAt: string; updatedAt?: string; finishedAt?: string | null;
 resultUrl?: string | null; errorCode: string | null; errorMessage: string | null;
};
