import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {History} from "./History";

it("preserves collapsed advanced inputs, applies them explicitly and resets all conditions",async()=>{
 const paths:string[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  paths.push(url);
  if(url==="/api/session")return Response.json({user:{id:"owner"}});
  if(url==="/api/templates")return Response.json({items:[]});
  return Response.json({items:[],nextCursor:null});
 }));
 render(<History/>);
 const toggle=await screen.findByRole("button",{name:"更多筛选"});
 expect(toggle).toHaveAttribute("aria-expanded","false");
 expect(screen.getByLabelText("标签筛选")).not.toBeVisible();
 fireEvent.click(toggle);
 fireEvent.change(screen.getByLabelText("标签筛选"),{target:{value:"旅行"}});
 fireEvent.change(screen.getByLabelText("开始日期"),{target:{value:"2026-10-01"}});
 fireEvent.click(toggle);fireEvent.click(toggle);
 expect(screen.getByLabelText("标签筛选")).toHaveValue("旅行");
 expect(paths.some(path=>path.includes("tag="))).toBe(false);
 fireEvent.click(screen.getByRole("button",{name:"应用筛选"}));
 await waitFor(()=>expect(paths.some(path=>path.includes("tag="))).toBe(true));
 expect(screen.getByText("已应用 2 项筛选")).toBeVisible();
 fireEvent.click(screen.getByRole("button",{name:"重置筛选"}));
 expect(screen.getByLabelText("标签筛选")).toHaveValue("");
 expect(screen.getByLabelText("开始日期")).toHaveValue("");
 expect(toggle).toHaveAttribute("aria-expanded","false");
});
