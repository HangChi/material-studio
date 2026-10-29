import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SubmissionForm } from "./SubmissionForm";
vi.mock("../assets/UploadSlots",()=>({UploadSlots:({initialIds}:{initialIds?:string[]})=><p>已恢复素材：{initialIds?.join(",")}</p>}));
const template={id:"demo-postcard",title:"明信片",description:"",categoryId:"creative",coverUrl:"/cover.png",requiredImageCount:2,acceptedMimeTypes:["image/png"],maxFileSizeBytes:5242880};
const parameters={title:"原作品",palette:"CREAM",format:"LANDSCAPE",crops:[{x:0.5,y:0.5,zoom:1},{x:0.5,y:0.5,zoom:1}]};
beforeEach(()=>{sessionStorage.clear();localStorage.clear();});
it("loads the source assets and parameters, then submits an edited independent version",async()=>{
 let posted:Record<string,unknown>|null=null;
 vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(url==="/api/jobs/old/recipe")return Response.json({assetIds:["one","two"],parameters,sourceJobId:null});
  if(options?.method==="POST"){posted=JSON.parse(options.body as string);return Response.json({error:{message:"test"}},{status:422});}
  return Response.json({items:[]});
 }));
 render(<SubmissionForm template={template} sourceJobId="old"/>);
 expect(await screen.findByText("已恢复素材：one,two")).toBeVisible();expect(screen.getByLabelText("明信片标题")).toHaveValue("原作品");
 fireEvent.change(screen.getByLabelText("明信片标题"),{target:{value:"新作品"}});fireEvent.click(screen.getByRole("button",{name:"提交制作"}));
 await waitFor(()=>expect(posted).toEqual(expect.objectContaining({sourceJobId:"old",assetIds:["one","two"],parameters:expect.objectContaining({title:"新作品"})})));
});
it("restores edited draft across remount without overwriting it from the original recipe",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):Response.json({assetIds:["one","two"],parameters,sourceJobId:null})));
 const view=render(<SubmissionForm template={template} sourceJobId="old"/>);await screen.findByText("已恢复素材：one,two");
 fireEvent.change(screen.getByLabelText("明信片标题"),{target:{value:"暂存的标题"}});
 await screen.findByText(/草稿已保存/);view.unmount();render(<SubmissionForm template={template} sourceJobId="old"/>);
 await screen.findByText("已恢复素材：one,two");expect(screen.getByLabelText("明信片标题")).toHaveValue("暂存的标题");
 fireEvent.click(screen.getByRole("button",{name:"清空草稿"}));expect(screen.getByLabelText("明信片标题")).toHaveValue("旅途来信");
});
it("reports a failed draft removal and preserves the current edited fields",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):Response.json({assetIds:["one","two"],parameters,sourceJobId:null})));
 render(<SubmissionForm template={template} sourceJobId="old"/>);await screen.findByText("已恢复素材：one,two");fireEvent.change(screen.getByLabelText("明信片标题"),{target:{value:"尚未清除"}});await screen.findByText(/草稿已保存/);
 const remove=vi.spyOn(Storage.prototype,"removeItem").mockImplementation(()=>{throw new Error("blocked");});
 fireEvent.click(screen.getByRole("button",{name:"清空草稿"}));expect(await screen.findByText(/无法清除本地草稿/)).toBeVisible();expect(screen.getByLabelText("明信片标题")).toHaveValue("尚未清除");remove.mockRestore();
});
