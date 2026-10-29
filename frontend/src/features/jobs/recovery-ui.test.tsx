import { render,screen } from "@testing-library/react";
import { expect,it } from "vitest";
import { JobCards } from "./JobCards";
it("shows a requeued attempt and its next execution time without inventing a failed task",()=>{
 render(<JobCards jobs={[{id:"retry",templateId:"demo-portrait",templateTitle:"肖像",status:"QUEUED",stage:null,version:6,createdAt:"2026-10-29T00:00:00Z",errorCode:null,errorMessage:null,attempt:1,nextAttemptAt:"2026-10-29T00:00:02Z",queueAhead:2}]} errors={{}} onRetry={()=>{}}/>);
 expect(screen.getByText("已执行 1 / 3 次，等待下一次执行")).toBeVisible();expect(screen.getByText(/下一次执行时间/)).toBeVisible();expect(screen.queryByText("制作失败")).not.toBeInTheDocument();
});
