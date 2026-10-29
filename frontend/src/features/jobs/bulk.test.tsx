import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {History} from "./History";
const job={id:"one",templateId:"demo-portrait",templateTitle:"肖像",status:"SUCCEEDED",stage:"FINALIZE",version:6,createdAt:"2026-10-30T00:00:00Z",favorite:false,hidden:false};
it("selects loaded works and updates them in one request",async()=>{
 const posted:Record<string,unknown>[]=[];vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});if(url==="/api/templates")return Response.json({items:[]});if(url.includes("active"))return Response.json({items:[]});
  if(url==="/api/works/bulk"){const body=JSON.parse(options!.body as string);posted.push(body);return Response.json({items:[{...job,favorite:true,version:7}]});}
  return Response.json({items:[job],nextCursor:null});
 }));render(<History/>);await screen.findByText("任务编号：one");fireEvent.click(screen.getByRole("checkbox",{name:"选择作品 one"}));fireEvent.click(screen.getByRole("button",{name:"批量收藏"}));
 await waitFor(()=>expect(posted).toEqual([{ids:["one"],favorite:true}]));expect(await screen.findByRole("heading",{name:/已收藏/})).toBeVisible();
});
it("sends exact normalized tag filtering and excludes unfiltered active records",async()=>{
 const paths:string[]=[];const active={...job,id:"active",status:"RUNNING",version:1};
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{paths.push(url);if(url==="/api/session")return Response.json({user:{id:"owner"}});if(url==="/api/templates")return Response.json({items:[]});if(url.includes("active"))return Response.json({items:[active]});return Response.json({items:url.includes("tag=")?[]:[job],nextCursor:null});}));
 render(<History/>);await screen.findByText("任务编号：one");fireEvent.change(screen.getByLabelText("标签筛选"),{target:{value:"旅行"}});fireEvent.click(screen.getByRole("button",{name:"应用筛选"}));await waitFor(()=>expect(paths.some(p=>p.includes("tag="))).toBe(true));expect(await screen.findByText("没有匹配的作品")).toBeVisible();expect(screen.queryByText("任务编号：active")).not.toBeInTheDocument();
});
