import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SubmissionForm } from "./SubmissionForm";
import { defaultParameters, PostcardEditor } from "./PostcardEditor";
import type { UploadSlotsProps } from "../assets/UploadSlots";
vi.mock("../assets/UploadSlots",()=>({UploadSlots:({onChange}:UploadSlotsProps)=><button type="button" onClick={()=>onChange(["asset-one","asset-two"])}>准备两张素材</button>}));
const template={id:"demo-postcard",title:"旅行明信片",description:"",categoryId:"creative",coverUrl:"/cover.png",requiredImageCount:2,acceptedMimeTypes:["image/png"],maxFileSizeBytes:5242880};
beforeEach(()=>sessionStorage.clear());
it("submits selected title palette format and per-image crop with a protected preview",async()=>{
 let body:Record<string,unknown>|null=null;
 vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(options?.method==="POST"){body=JSON.parse(options.body as string);return Response.json({error:{message:"test rejected"}},{status:422});}
  return Response.json({items:[]});
 }));
 render(<SubmissionForm template={template}/>);fireEvent.click(await screen.findByRole("button",{name:"准备两张素材"}));
 fireEvent.change(screen.getByLabelText("明信片标题"),{target:{value:"海边的来信"}});
 fireEvent.change(screen.getByLabelText("配色"),{target:{value:"OCEAN"}});fireEvent.change(screen.getByLabelText("输出比例"),{target:{value:"SQUARE"}});
 fireEvent.change(screen.getByLabelText("图片 1 横向位置"),{target:{value:"0.25"}});fireEvent.change(screen.getByLabelText("图片 2 放大"),{target:{value:"2"}});
 expect(screen.getByRole("img",{name:"图片 1 裁剪预览"})).toHaveAttribute("src","/api/assets/asset-one/content");
 fireEvent.click(screen.getByRole("button",{name:"提交制作"}));await waitFor(()=>expect(body).toEqual(expect.objectContaining({parameters:{title:"海边的来信",palette:"OCEAN",format:"SQUARE",crops:[{x:0.25,y:0.5,zoom:1},{x:0.5,y:0.5,zoom:2}]}})));
});
it("disables all editing for an uncertain operation and gives separate controls to both images",()=>{
 render(<PostcardEditor value={defaultParameters()} onChange={()=>{}} assets={[]} disabled/>);
 expect(screen.getByLabelText("明信片标题")).toBeDisabled();expect(screen.getByLabelText("图片 1 横向位置")).toBeDisabled();expect(screen.getByLabelText("图片 2 横向位置")).toBeDisabled();
});
