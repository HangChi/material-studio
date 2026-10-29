import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { UploadSlots } from "./UploadSlots";
const template={id:"demo-postcard",title:"明信片",description:"",categoryId:"creative",coverUrl:"/cover.png",requiredImageCount:2,acceptedMimeTypes:["image/png"],maxFileSizeBytes:5242880};
it("reuses a private asset in a slot without uploading and preserves the other slot",async()=>{
 const onChange=vi.fn(),fetcher=vi.fn(async(...args:[string,RequestInit])=>{void args;return Response.json({items:[{id:"two",url:"/api/assets/two/content",mimeType:"image/png",sizeBytes:100,createdAt:"2026-10-29T00:00:00Z"}],nextCursor:null});});vi.stubGlobal("fetch",fetcher);
 render(<UploadSlots template={template} initialIds={["one",null]} onChange={onChange}/>);
 fireEvent.click(screen.getByRole("button",{name:"从素材库选择图片 2"}));fireEvent.click(await screen.findByRole("button",{name:"使用素材 two"}));
 await waitFor(()=>expect(onChange).toHaveBeenCalledWith(["one","two"]));expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][1]?.method).not.toBe("POST");
});
