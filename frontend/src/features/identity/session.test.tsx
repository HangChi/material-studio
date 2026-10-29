import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { SessionGate } from "./SessionGate";
function deferred(){let resolve!:(r:Response)=>void;return {promise:new Promise<Response>(r=>{resolve=r;}),resolve:(r:Response)=>resolve(r)};}
describe("visitor identity boundary",()=>{
 it("unmounts the old private view immediately and mounts only the new identity after switch",async()=>{
  const revoked=deferred(),cleanup=vi.fn();let creates=0;
  vi.stubGlobal("fetch",vi.fn(async(_url:string,options:RequestInit)=>options.method==="DELETE"?revoked.promise:Response.json({user:{id:++creates===1?"owner-a":"owner-b"}})));
  function Private({owner}:{owner:string}){useEffect(()=>()=>{cleanup(owner);},[owner]);return <p>记录归属：{owner}</p>;}
  render(<SessionGate allowSwitch>{owner=><Private key={owner} owner={owner}/>}</SessionGate>);
  expect(await screen.findByText("记录归属：owner-a")).toBeVisible();
  const button=screen.getByRole("button",{name:"切换为新访客"});fireEvent.click(button);fireEvent.click(button);
  expect(screen.queryByText("记录归属：owner-a")).not.toBeInTheDocument();expect(cleanup).toHaveBeenCalledWith("owner-a");
  expect(screen.getByRole("status")).toHaveTextContent("正在切换访客");
  await act(async()=>{revoked.resolve(new Response(null,{status:204}));});
  expect(await screen.findByText("记录归属：owner-b")).toBeVisible();expect(creates).toBe(2);
 });
 it("does not restore private data when switching fails and supports explicitly establishing a visitor again",async()=>{
  let failed=false;vi.stubGlobal("fetch",vi.fn(async(_url:string,options:RequestInit)=>{
   if(options.method==="DELETE"){failed=true;throw new Error("offline");}
   return Response.json({user:{id:failed?"recovered":"owner-a"}});
  }));
  render(<SessionGate allowSwitch>{owner=><p>{owner}</p>}</SessionGate>);await screen.findByText("owner-a");fireEvent.click(screen.getByRole("button",{name:"切换为新访客"}));
  expect(await screen.findByRole("button",{name:"重新建立访客身份"})).toBeVisible();expect(screen.queryByText("owner-a")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"重新建立访客身份"}));expect(await screen.findByText("recovered")).toBeVisible();
 });
 it("aborts identity initialization and ignores its late response after unmount",async()=>{
  const pending=deferred();const fetcher=vi.fn().mockReturnValue(pending.promise);vi.stubGlobal("fetch",fetcher);
  const view=render(<SessionGate>{owner=><p>{owner}</p>}</SessionGate>);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
  const signal=fetcher.mock.calls[0][1].signal as AbortSignal;view.unmount();expect(signal.aborted).toBe(true);
  await act(async()=>{pending.resolve(Response.json({user:{id:"late"}}));});expect(screen.queryByText("late")).not.toBeInTheDocument();
 });
});
