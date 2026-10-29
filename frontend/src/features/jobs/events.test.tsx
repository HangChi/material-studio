import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { JobEvents } from "./JobEvents";
const event={version:1,stage:"GENERATE",kind:"STARTED",createdAt:"2026-10-29T01:00:00Z",message:"图片制作开始"};
it("loads only expanded events, refreshes on version changes and recovers an independent query failure",async()=>{
 let reads=0;vi.stubGlobal("fetch",vi.fn(async()=>{reads++;return reads===2?Response.json({error:{}},{status:503}):Response.json({items:[event]});}));
 const view=render(<JobEvents id="one" version={1} onExpire={()=>{}}/>);expect(reads).toBe(0);
 fireEvent.click(screen.getByRole("button",{name:"查看执行详情 one"}));expect(await screen.findByText("图片制作开始")).toBeVisible();
 view.rerender(<JobEvents id="one" version={2} onExpire={()=>{}}/>);expect(await screen.findByText(/执行详情读取失败/)).toBeVisible();expect(screen.getByText("图片制作开始")).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"重新读取详情 one"}));await waitFor(()=>expect(reads).toBe(3));await waitFor(()=>expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
it("aborts closed requests and ignores late responses",async()=>{
 let resolve!:(r:Response)=>void;const fetcher=vi.fn((...args:[string,RequestInit])=>{void args;return new Promise<Response>(r=>{resolve=r;});});vi.stubGlobal("fetch",fetcher);
 render(<JobEvents id="one" version={1} onExpire={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"查看执行详情 one"}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));fireEvent.click(screen.getByRole("button",{name:"收起执行详情 one"}));
 expect(fetcher.mock.calls[0][1].signal?.aborted).toBe(true);await act(async()=>resolve(Response.json({items:[event]})));expect(screen.queryByText("图片制作开始")).not.toBeInTheDocument();
});
