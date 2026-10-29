import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect,it,vi } from "vitest";
import { History } from "./History";
const job={id:"one",templateId:"demo-portrait",templateTitle:"肖像",status:"SUCCEEDED",stage:"FINALIZE",version:6,createdAt:"2026-10-29T00:00:00Z",errorCode:null,errorMessage:null,favorite:false,hidden:false};
it("applies server filters and updates terminal work metadata including recoverable hiding",async()=>{
 const paths:string[]=[];vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  paths.push(url);if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(options?.method==="PATCH"){const changes=JSON.parse(options.body as string);return Response.json({job:{...job,...changes,version:7}});}
  if(url.includes("/active"))return Response.json({items:[]});
  return Response.json({items:[job],nextCursor:null});
 }));
 render(<History/>);await screen.findByText("任务编号：one");
 fireEvent.change(screen.getByLabelText("作品名称 one"),{target:{value:"海边"}});fireEvent.click(screen.getByRole("button",{name:"保存名称 one"}));await screen.findByRole("heading",{name:"海边"});
 fireEvent.change(screen.getByLabelText("搜索作品"),{target:{value:"海边"}});fireEvent.click(screen.getByRole("button",{name:"应用筛选"}));await waitFor(()=>expect(paths.some(path=>path.includes("q=%E6%B5%B7%E8%BE%B9"))).toBe(true));
});
