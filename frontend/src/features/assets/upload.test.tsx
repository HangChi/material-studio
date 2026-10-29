import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadSlots } from "./UploadSlots";

const template={ id:"demo-portrait",title:"日光肖像",description:"样张",categoryId:"creative",coverUrl:"/cover.png",requiredImageCount:1,acceptedMimeTypes:["image/jpeg","image/png"],maxFileSizeBytes:5242880 };
const file=(name="a.png")=>new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],name,{type:"image/png"});
let serial=0;
beforeEach(()=>{
  serial=0;
  vi.stubGlobal("createImageBitmap",vi.fn().mockImplementation(async()=>({width:8,height:8,close:vi.fn()})));
  vi.spyOn(URL,"createObjectURL").mockImplementation(()=>`blob:preview-${++serial}`);
  vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{});
});
function select(image:File){fireEvent.change(screen.getByLabelText("图片 1"),{target:{files:[image]}});}

describe("private image slots",()=>{
 it("previews and uploads a file before emitting a usable asset ID",async()=>{
  const callback=vi.fn(); const mock=vi.fn().mockResolvedValue(Response.json({id:"asset-1"},{status:201}));vi.stubGlobal("fetch",mock);
  render(<UploadSlots template={template} onChange={callback}/>);select(file());
  expect(await screen.findByText("图片 1 已上传")).toBeVisible();
  expect(screen.getByRole("img",{name:"图片 1 预览"})).toHaveAttribute("src","blob:preview-1");
  expect(callback).toHaveBeenLastCalledWith(["asset-1"]);
  expect((mock.mock.calls[0][1] as RequestInit).body).toBeInstanceOf(FormData);
 });
 it("aborts replaced upload and ignores its late response",async()=>{
  let oldResolve!:(r:Response)=>void;
  const mock=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{oldResolve=resolve;})).mockResolvedValue(Response.json({id:"new"},{status:201}));
  vi.stubGlobal("fetch",mock);const callback=vi.fn();render(<UploadSlots template={template} onChange={callback}/>);
  select(file("old.png"));await waitFor(()=>expect(mock).toHaveBeenCalledTimes(1));
  const oldSignal=(mock.mock.calls[0][1] as RequestInit).signal;
  select(file("new.png"));await screen.findByText("图片 1 已上传");
  await act(async()=>{oldResolve(Response.json({id:"old"},{status:201}));});
  expect(oldSignal?.aborted).toBe(true);expect(callback).toHaveBeenLastCalledWith(["new"]);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
 });
 it("removes a slot and never fills it back from an ignored-abort response",async()=>{
  let resolve!:(r:Response)=>void;const mock=vi.fn(()=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal("fetch",mock);
  const callback=vi.fn();render(<UploadSlots template={template} onChange={callback}/>);select(file());
  await waitFor(()=>expect(mock).toHaveBeenCalled());fireEvent.click(screen.getByRole("button",{name:"移除图片 1"}));
  await act(async()=>{resolve(Response.json({id:"late"},{status:201}));});
  expect(callback).toHaveBeenLastCalledWith([null]);expect(screen.queryByRole("img")).not.toBeInTheDocument();
 });
 it("can retry an upload failure without losing other slots",async()=>{
  const mock=vi.fn().mockRejectedValue(new Error("offline"));vi.stubGlobal("fetch",mock);
  render(<UploadSlots template={template} onChange={vi.fn()}/>);select(file());
  expect(await screen.findByRole("alert")).toHaveTextContent("上传失败");
  mock.mockResolvedValue(Response.json({id:"retry"},{status:201}));fireEvent.click(screen.getByRole("button",{name:"重试图片 1"}));
  expect(await screen.findByText("图片 1 已上传")).toBeVisible();
 });
 it("rejects type, size, corrupt decoding and huge pixel count before uploading",async()=>{
  const mock=vi.fn();vi.stubGlobal("fetch",mock);render(<UploadSlots template={template} onChange={vi.fn()}/>);
  select(new File(["gif"],"a.gif",{type:"image/gif"}));expect(await screen.findByRole("alert")).toHaveTextContent("JPEG或PNG");
  select(new File([new Uint8Array(5242881)],"large.png",{type:"image/png"}));expect(await screen.findByRole("alert")).toHaveTextContent("5 MiB");
  vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("decode"));select(file());expect(await screen.findByRole("alert")).toHaveTextContent("无法读取图片");
  vi.mocked(createImageBitmap).mockResolvedValueOnce({width:6000,height:6000,close:vi.fn()} as unknown as ImageBitmap);select(file());expect(await screen.findByRole("alert")).toHaveTextContent("2000万像素");
  expect(mock).not.toHaveBeenCalled();
 });
 it("cleans up requests and object URLs on unmount",async()=>{
  const mock=vi.fn(()=>new Promise<Response>(()=>{}));vi.stubGlobal("fetch",mock);
  const view=render(<UploadSlots template={template} onChange={vi.fn()}/>);select(file());
  await waitFor(()=>expect(mock).toHaveBeenCalled());const signal=(mock.mock.calls as unknown as [string,RequestInit][])[0][1].signal;
  view.unmount();expect(signal?.aborted).toBe(true);expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
 });
});
