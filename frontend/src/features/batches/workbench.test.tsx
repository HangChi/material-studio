import {fireEvent,render,screen,within} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {Batches} from "./Batches";
import type {UploadSlotsProps} from "../assets/UploadSlots";
vi.mock("../assets/UploadSlots",()=>({UploadSlots:({onChange,template}:UploadSlotsProps)=><button type="button" onClick={()=>onChange(Array.from({length:template.requiredImageCount},(_,i)=>`asset-${i}`))}>准备素材</button>}));
const templates=[{id:"demo-portrait",title:"肖像",requiredImageCount:1},{id:"demo-postcard",title:"明信片",requiredImageCount:2}];
function identity(){vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):url==="/api/templates"?Response.json({items:templates}):Response.json({items:[],nextCursor:null})));}
it("shows preparation progress independently for each item and enables the single submit action only when all are ready",async()=>{
 identity();render(<Batches/>);await screen.findByRole("button",{name:"准备素材"});
 const progress=screen.getByRole("progressbar",{name:"素材准备进度"});
 expect(progress).toHaveAttribute("max","1");expect(progress).toHaveAttribute("value","0");
 fireEvent.click(screen.getByRole("button",{name:"增加制作项"}));
 fireEvent.click(screen.getAllByRole("button",{name:"准备素材"})[0]);
 expect(progress).toHaveAttribute("max","2");expect(progress).toHaveAttribute("value","1");
 expect(screen.getByRole("button",{name:"提交批次"})).toBeDisabled();
 fireEvent.click(screen.getAllByRole("button",{name:"准备素材"})[1]);
 expect(progress).toHaveAttribute("value","2");
 expect(screen.getAllByRole("button",{name:"提交批次"})).toHaveLength(1);
 expect(screen.getByRole("button",{name:"提交批次"})).toBeEnabled();
});
it("resets only the changed template and keeps remaining items ready after removing a row",async()=>{
 identity();render(<Batches/>);await screen.findByRole("button",{name:"准备素材"});
 fireEvent.click(screen.getByRole("button",{name:"增加制作项"}));
 screen.getAllByRole("button",{name:"准备素材"}).forEach(button=>fireEvent.click(button));
 fireEvent.change(screen.getByLabelText("制作项 1 模板"),{target:{value:"demo-postcard"}});
 expect(screen.getByRole("progressbar",{name:"素材准备进度"})).toHaveAttribute("value","1");
 const first=screen.getByRole("region",{name:"制作项 1"});
 expect(within(first).getByText("需要 2 张图片")).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"移除制作项 1"}));
 expect(screen.getByRole("progressbar",{name:"素材准备进度"})).toHaveAttribute("max","1");
 expect(screen.getByRole("progressbar",{name:"素材准备进度"})).toHaveAttribute("value","1");
 expect(screen.getByLabelText("制作项 1 模板")).toHaveValue("demo-portrait");
 expect(screen.getByRole("button",{name:"提交批次"})).toBeEnabled();
});
it("retains at least one item and makes the ten-item limit visible",async()=>{
 identity();render(<Batches/>);await screen.findByRole("button",{name:"准备素材"});
 expect(screen.getByRole("button",{name:"移除制作项 1"})).toBeDisabled();
 for(let i=1;i<10;i++)fireEvent.click(screen.getByRole("button",{name:"增加制作项"}));
 expect(screen.getByRole("button",{name:"增加制作项"})).toBeDisabled();
 expect(screen.getByText("10 / 10 项")).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"移除制作项 10"}));
 expect(screen.getByRole("button",{name:"增加制作项"})).toBeEnabled();
});
