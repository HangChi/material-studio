import {act,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {SessionGate} from "./SessionGate";
import {History} from "../jobs/History";

it("offers account access without exposing a guest identifier or rotating the current identity",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({user:{id:"guest-private-id"}}));vi.stubGlobal("fetch",fetcher);
 render(<SessionGate showIdentity>{()=> <p>本人作品</p>}</SessionGate>);
 await screen.findByText("本人作品");
 const notice=within(screen.getByRole("region",{name:"当前身份"}));
 expect(notice.getByText("无需登录即可制作")).toBeVisible();
 expect(notice.getByRole("link",{name:"登录 / 注册"})).toHaveAttribute("href","/account");
 expect(screen.queryByText(/guest-private/)).not.toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"切换为新访客"})).not.toBeInTheDocument();
 expect(fetcher).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[0][1]).toEqual(expect.objectContaining({method:"POST"}));
});

it("signs out a logged-in account without retaining its private view",async()=>{
 let finish!:(r:Response)=>void,reads=0;
 const pending=new Promise<Response>(resolve=>{finish=resolve;});
 vi.stubGlobal("fetch",vi.fn(async(_url:string,options:RequestInit)=>options.method==="DELETE"?pending:Response.json({user:++reads===1?{id:"account",username:"demo_user"}:{id:"new-guest"}})));
 render(<SessionGate showIdentity>{owner=><p>记录归属：{owner}</p>}</SessionGate>);
 await screen.findByText("记录归属：account");
 expect(screen.getByText("demo_user")).toBeVisible();
 expect(screen.getByRole("link",{name:"管理账号"})).toHaveAttribute("href","/account");
 fireEvent.click(screen.getByRole("button",{name:"退出登录"}));
 expect(screen.queryByText("记录归属：account")).not.toBeInTheDocument();
 expect(screen.getByRole("status")).toHaveTextContent("正在退出登录");
 await act(async()=>{finish(new Response(null,{status:204}));});
 expect(await screen.findByText("记录归属：new-guest")).toBeVisible();
 expect(localStorage.getItem("material-visitor-epoch")).toBeTruthy();
 expect(reads).toBe(2);
});

it("keeps private data hidden on a failed logout and retries by verifying the current session",async()=>{
 const fetcher=vi.fn(async(_url:string,options:RequestInit)=>options.method==="DELETE"?Response.json({error:{}},{status:503}):Response.json({user:{id:"account",username:"demo_user"}}));
 vi.stubGlobal("fetch",fetcher);
 render(<SessionGate showIdentity>{()=> <p>账号作品</p>}</SessionGate>);
 await screen.findByText("账号作品");fireEvent.click(screen.getByRole("button",{name:"退出登录"}));
 await screen.findByRole("alert");expect(screen.queryByText("账号作品")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"重新连接"}));
 expect(await screen.findByText("账号作品")).toBeVisible();
 expect(fetcher).toHaveBeenCalledTimes(3);
});

it("directs an expired session to account access without automatically creating a replacement guest",async()=>{
 const fetcher=vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):url==="/api/templates"?Response.json({items:[]}):Response.json({error:{}},{status:401}));
 vi.stubGlobal("fetch",fetcher);render(<History/>);
 expect(await screen.findByRole("link",{name:"重新登录"})).toHaveAttribute("href","/account");
 expect(screen.getByRole("alert")).toHaveTextContent("当前会话已失效");
 expect(screen.queryByText(/刷新页面重新建立/)).not.toBeInTheDocument();
 await waitFor(()=>expect(fetcher.mock.calls.filter(([url])=>url==="/api/session")).toHaveLength(1));
});
