import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {useState} from "react";
import {BulkControls} from "./BulkControls";
import type {Job} from "./types";
const job:Job={id:"one",templateId:"demo-portrait",templateTitle:"肖像",status:"SUCCEEDED",stage:"FINALIZE",version:6,createdAt:"2026-10-30T00:00:00Z",errorCode:null,errorMessage:null};
function Controls({jobs=[job]}:{jobs?:Job[]}){
 const [selected,onSelect]=useState<string[]>([]);
 return <BulkControls jobs={jobs} selected={selected} onSelect={onSelect} onUpdated={()=>{}} onExpire={()=>{}}/>;
}
it("reveals actions only after selection and keeps tag editing compact without changing the payload",async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({items:[job]}));vi.stubGlobal("fetch",fetcher);
 render(<Controls/>);
 expect(screen.queryByRole("button",{name:"批量收藏"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"选择已加载作品（最多50项）"}));
 expect(screen.getByRole("button",{name:"批量收藏"})).toBeEnabled();
 expect(screen.getByRole("status")).toHaveTextContent("已选择 1 项");
 expect(screen.getByLabelText("批量标签")).not.toBeVisible();
 fireEvent.click(screen.getByText("设置标签",{exact:true}));
 expect(screen.getByLabelText("批量标签")).toBeVisible();
 fireEvent.change(screen.getByLabelText("批量标签"),{target:{value:"旅行， 周末"}});
 fireEvent.click(screen.getByRole("button",{name:"设置所选标签"}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ids:["one"],tags:["旅行","周末"]});
 await waitFor(()=>expect(screen.queryByRole("button",{name:"批量收藏"})).not.toBeInTheDocument());
 expect(screen.getByRole("button",{name:"选择已加载作品（最多50项）"})).toHaveFocus();
});
it("does not render batch tools for an empty collection",()=>{
 render(<Controls jobs={[]}/>);
 expect(screen.queryByRole("region",{name:"批量管理"})).not.toBeInTheDocument();
});
it("explains why unfinished results cannot be included in a ZIP",()=>{
 render(<Controls jobs={[{...job,status:"RUNNING"}]}/>);
 fireEvent.click(screen.getByRole("button",{name:"选择已加载作品（最多50项）"}));
 expect(screen.getByRole("button",{name:"下载所选 ZIP"})).toBeDisabled();
 expect(screen.getByText("仅支持打包最多 20 项已成功的作品")).toBeVisible();
});

it("toggles all loaded work while keeping the selection capped at fifty",()=>{
 render(<Controls jobs={Array.from({length:51},(_,index)=>({...job,id:`work-${index}`}))}/>);
 const select=screen.getByRole("button",{name:"选择已加载作品（最多50项）"});fireEvent.click(select);
 expect(screen.getByRole("status")).toHaveTextContent("已选择 50 项");const cancel=screen.getByRole("button",{name:"取消选择已加载作品"});expect(cancel).toHaveAttribute("aria-pressed","true");fireEvent.click(cancel);
 expect(screen.getByRole("button",{name:"选择已加载作品（最多50项）"})).toHaveAttribute("aria-pressed","false");expect(screen.queryByRole("button",{name:"批量收藏"})).not.toBeInTheDocument();
});
