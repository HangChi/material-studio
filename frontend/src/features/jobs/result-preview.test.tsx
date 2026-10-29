import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobCards } from "./JobCards";
import type { Job } from "./types";
const job=(id:string):Job=>({id,templateId:"demo-portrait",templateTitle:`作品${id}`,status:"SUCCEEDED",stage:"FINALIZE",version:6,createdAt:"2026-10-29T00:00:00Z",errorCode:null,errorMessage:null,resultUrl:`/api/jobs/${id}/result`});
describe("private result resource recovery",()=>{
 it("keeps production success and the other image intact while retrying one failed preview",async()=>{
  const retryTask=vi.fn(),fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
  render(<JobCards jobs={[Object.freeze(job("a")),Object.freeze(job("b"))]} errors={{}} onRetry={retryTask}/>);
  const cards=screen.getAllByRole("article"),a=within(cards[0]),b=within(cards[1]);
  fireEvent.error(a.getByRole("img",{name:"作品a制作结果"}));
  expect(a.getByRole("alert")).toHaveTextContent("结果图片加载失败，制作状态仍为成功。");expect(a.getByText("制作成功")).toBeVisible();
  expect(b.getByRole("img",{name:"作品b制作结果"})).toHaveProperty("src",new URL("/api/jobs/b/result",window.location.href).href);expect(b.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(a.getByRole("button",{name:"重新加载图片"}));
  const reloaded=a.getByRole("img",{name:"作品a制作结果"});expect(reloaded).toHaveProperty("src",new URL("/api/jobs/a/result?previewAttempt=1",window.location.href).href);expect(a.getByRole("status")).toHaveTextContent("正在重新加载图片");
  fireEvent.load(reloaded);expect(a.queryByRole("alert")).not.toBeInTheDocument();await waitFor(()=>expect(a.queryByRole("status")).not.toBeInTheDocument());
  expect(a.getByText("制作成功")).toBeVisible();expect(retryTask).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
 });
 it("allows repeated resource failures to be retried without creating another job",()=>{
  render(<JobCards jobs={[job("a")]} errors={{}} onRetry={vi.fn()}/>);
  for(let attempt=1;attempt<=2;attempt++){
   fireEvent.error(screen.getByRole("img",{name:"作品a制作结果"}));fireEvent.click(screen.getByRole("button",{name:"重新加载图片"}));
   expect(screen.getByRole("img",{name:"作品a制作结果"})).toHaveProperty("src",new URL(`/api/jobs/a/result?previewAttempt=${attempt}`,window.location.href).href);
   expect(screen.getByText("制作成功")).toBeVisible();
  }
 });
 it("does not offer preview retry for a task that failed execution",()=>{
  render(<JobCards jobs={[{...job("a"),status:"FAILED",resultUrl:null,errorCode:"SIMULATED_FAILURE",errorMessage:"模拟失败"}]} errors={{}} onRetry={vi.fn()}/>);
  expect(screen.getByText("制作失败")).toBeVisible();expect(screen.queryByRole("img")).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"重新加载图片"})).not.toBeInTheDocument();
 });
});
