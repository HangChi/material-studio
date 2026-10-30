import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionGate } from "./SessionGate";
function deferred(){let resolve!:(r:Response)=>void;return {promise:new Promise<Response>(r=>{resolve=r;}),resolve:(r:Response)=>resolve(r)};}
describe("visitor identity boundary",()=>{
 it("aborts identity initialization and ignores its late response after unmount",async()=>{
  const pending=deferred();const fetcher=vi.fn().mockReturnValue(pending.promise);vi.stubGlobal("fetch",fetcher);
  const view=render(<SessionGate>{owner=><p>{owner}</p>}</SessionGate>);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
  const signal=fetcher.mock.calls[0][1].signal as AbortSignal;view.unmount();expect(signal.aborted).toBe(true);
  await act(async()=>{pending.resolve(Response.json({user:{id:"late"}}));});expect(screen.queryByText("late")).not.toBeInTheDocument();
 });
 it("invalidates private views when another tab announces an account change",async()=>{
  const pending=deferred();let creates=0;vi.stubGlobal("fetch",vi.fn(async()=>++creates===1?Response.json({user:{id:"owner-a"}}):pending.promise));
  render(<SessionGate>{owner=><p>记录归属：{owner}</p>}</SessionGate>);await screen.findByText("记录归属：owner-a");
  act(()=>window.dispatchEvent(new StorageEvent("storage",{key:"material-visitor-epoch",newValue:"changed"})));
  expect(screen.queryByText("记录归属：owner-a")).not.toBeInTheDocument();
  await act(async()=>{pending.resolve(Response.json({user:{id:"owner-b"}}));});expect(await screen.findByText("记录归属：owner-b")).toBeVisible();
 });
});
