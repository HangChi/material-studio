import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { JobEvents } from "./JobEvents";
const show=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"showModal"),close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"close");
beforeAll(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,"showModal",{configurable:true,value:function(this:HTMLDialogElement){this.open=true;}});
 Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.open=false;}});
});
afterAll(()=>{for(const [name,descriptor] of [["showModal",show],["close",close]] as const){if(descriptor)Object.defineProperty(HTMLDialogElement.prototype,name,descriptor);else Reflect.deleteProperty(HTMLDialogElement.prototype,name);}});
const event={version:1,stage:"GENERATE",kind:"STARTED",createdAt:"2026-10-29T01:00:00Z",message:"图片制作开始"};
it("loads only expanded events, refreshes on version changes and recovers an independent query failure",async()=>{
 let reads=0;vi.stubGlobal("fetch",vi.fn(async()=>{reads++;return reads===2?Response.json({error:{}},{status:503}):Response.json({items:[event]});}));
 const view=render(<JobEvents id="one" version={1} onExpire={()=>{}}/>);expect(reads).toBe(0);
 fireEvent.click(screen.getByRole("button",{name:"查看执行详情 one"}));expect(await screen.findByText("图片制作开始")).toBeVisible();expect(screen.getByRole("dialog",{name:"执行详情"})).toBeVisible();
 view.rerender(<JobEvents id="one" version={2} onExpire={()=>{}}/>);expect(await screen.findByText(/执行详情读取失败/)).toBeVisible();expect(screen.getByText("图片制作开始")).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"重新读取详情 one"}));await waitFor(()=>expect(reads).toBe(3));await waitFor(()=>expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
it("aborts closed requests and ignores late responses",async()=>{
 let resolve!:(r:Response)=>void;const fetcher=vi.fn((...args:[string,RequestInit])=>{void args;return new Promise<Response>(r=>{resolve=r;});});vi.stubGlobal("fetch",fetcher);
 render(<JobEvents id="one" version={1} onExpire={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"查看执行详情 one"}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));fireEvent.click(screen.getByRole("button",{name:"关闭执行详情"}));
 expect(fetcher.mock.calls[0][1].signal?.aborted).toBe(true);await act(async()=>resolve(Response.json({items:[event]})));expect(screen.queryByText("图片制作开始")).not.toBeInTheDocument();
});

it("closes with Escape, restores the scroll lock and returns focus without scrolling",async()=>{
 const overflow=document.body.style.overflow,padding=document.body.style.paddingRight;vi.stubGlobal("fetch",vi.fn(async()=>Response.json({items:[event]})));
 render(<JobEvents id="one" version={1} onExpire={()=>{}}/>);const trigger=screen.getByRole("button",{name:"查看执行详情 one"});trigger.focus();fireEvent.click(trigger);
 const dialog=await screen.findByRole("dialog",{name:"执行详情"});expect(document.body.style.overflow).toBe("hidden");expect(trigger).toHaveAttribute("aria-haspopup","dialog");
 fireEvent(dialog,new Event("cancel",{bubbles:false,cancelable:true}));await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());expect(document.body.style.overflow).toBe(overflow);expect(document.body.style.paddingRight).toBe(padding);expect(trigger).toHaveFocus();
});

it("closes on the backdrop and restores body styles when an open tracker unmounts",async()=>{
 const overflow=document.body.style.overflow;vi.stubGlobal("fetch",vi.fn(async()=>Response.json({items:[event]})));
 const view=render(<JobEvents id="one" version={1} onExpire={()=>{}}/>);const trigger=screen.getByRole("button",{name:"查看执行详情 one"});fireEvent.click(trigger);
 fireEvent.click(await screen.findByRole("dialog",{name:"执行详情"}),{clientX:-1,clientY:-1});await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());expect(document.body.style.overflow).toBe(overflow);
 fireEvent.click(trigger);await screen.findByRole("dialog",{name:"执行详情"});view.unmount();expect(document.body.style.overflow).toBe(overflow);
});
