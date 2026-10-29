import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {History} from "./History";
it("loads new template choices from Java and sends the chosen id to history",async()=>{
 const paths:string[]=[];vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  paths.push(url);if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(url==="/api/templates")return Response.json({items:[{id:"new-template",title:"新模板"}]});
  return Response.json({items:[],nextCursor:null});
 }));
 render(<History/>);expect(await screen.findByRole("option",{name:"新模板"})).toBeVisible();
 fireEvent.change(screen.getByLabelText("模板",{exact:true}),{target:{value:"new-template"}});
 fireEvent.click(screen.getByRole("button",{name:"应用筛选"}));
 await waitFor(()=>expect(paths.some(url=>url.includes("templateId=new-template"))).toBe(true));
});
it("keeps records usable when template loading fails and supports retry",async()=>{
 let reads=0;vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(url==="/api/templates")return ++reads===1?Response.json({error:{}},{status:503}):Response.json({items:[{id:"new",title:"恢复模板"}]});
  return Response.json({items:[],nextCursor:null});
 }));
 render(<History/>);await screen.findByText("还没有制作记录");
 fireEvent.click(await screen.findByRole("button",{name:"重新加载模板选项"}));
 expect(await screen.findByRole("option",{name:"恢复模板"})).toBeVisible();
});
it("aborts the template request when history is unmounted",async()=>{
 let signal:AbortSignal|undefined;
 vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(url==="/api/templates"){signal=options?.signal as AbortSignal;return new Promise<Response>(()=>{});}
  return Response.json({items:[],nextCursor:null});
 }));
 const view=render(<History/>);await waitFor(()=>expect(signal).toBeDefined());view.unmount();expect(signal!.aborted).toBe(true);
});
