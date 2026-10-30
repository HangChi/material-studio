import {act,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {HeaderAccount} from "./HeaderAccount";
import {Account} from "../features/identity/Account";
const route=vi.hoisted(()=>({pathname:"/"}));
vi.mock("next/navigation",()=>({usePathname:()=>route.pathname}));
function deferred(){let resolve!:(r:Response)=>void;return {promise:new Promise<Response>(r=>{resolve=r;}),resolve:(r:Response)=>resolve(r)};}
it("offers login without creating a visitor when no readable session exists",async()=>{
 route.pathname="/";const fetcher=vi.fn(async()=>Response.json({error:{message:"expired"}},{status:401}));vi.stubGlobal("fetch",fetcher);
 render(<HeaderAccount/>);expect(await screen.findByRole("link",{name:"登录"})).toHaveAttribute("href","/account");
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));expect(fetcher.mock.calls[0]).toEqual(["/api/session",expect.objectContaining({method:"GET",cache:"no-store"})]);
});
it("shows the current account and refreshes when the route changes",async()=>{
 route.pathname="/";const fetcher=vi.fn().mockResolvedValueOnce(Response.json({user:{id:"a",username:"studio_chen"}})).mockResolvedValueOnce(Response.json({user:{id:"guest"}}));vi.stubGlobal("fetch",fetcher);
 const view=render(<HeaderAccount/>);expect(await screen.findByRole("link",{name:"管理账号：studio_chen"})).toHaveTextContent("studio_chen");
 route.pathname="/account";view.rerender(<HeaderAccount/>);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));expect(await screen.findByRole("link",{name:"登录"})).toHaveAttribute("aria-current","page");
});
it("discards old identity reads across tabs and aborts on unmount",async()=>{
 route.pathname="/";const old=deferred(),current=deferred();const fetcher=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);vi.stubGlobal("fetch",fetcher);
 const view=render(<HeaderAccount/>);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));
 act(()=>window.dispatchEvent(new StorageEvent("storage",{key:"material-visitor-epoch",newValue:"changed"})));await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
 await act(async()=>old.resolve(Response.json({user:{id:"old",username:"old_user"}})));expect(screen.queryByText("old_user")).not.toBeInTheDocument();
 view.unmount();expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);await act(async()=>current.resolve(Response.json({user:{id:"new",username:"new_user"}})));expect(screen.queryByText("new_user")).not.toBeInTheDocument();
});
it("keeps the login link available when the session lookup fails",async()=>{
 route.pathname="/";vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));render(<HeaderAccount/>);
 expect(await screen.findByRole("link",{name:"登录"})).toHaveAttribute("href","/account");
});
it("updates the header after registration without losing the once-only recovery code",async()=>{
 route.pathname="/account";let registered=false;vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
  if(url==="/api/session")return Response.json({user:registered?{id:"guest",username:"studio_chen"}:{id:"guest"}});
  expect(options?.method).toBe("POST");registered=true;return Response.json({user:{id:"guest",username:"studio_chen"},recoveryCode:"temporary-only-recovery"},{status:201});
 }));
 render(<><HeaderAccount/><Account/></>);fireEvent.click(await screen.findByRole("button",{name:"注册"}));fireEvent.change(screen.getByLabelText("用户名"),{target:{value:"studio_chen"}});fireEvent.change(screen.getByLabelText("密码"),{target:{value:"test-password-2026!"}});fireEvent.click(screen.getByRole("button",{name:"注册账号"}));
 expect(await screen.findByLabelText("一次性恢复码")).toHaveTextContent("temporary-only-recovery");expect(await screen.findByRole("link",{name:"管理账号：studio_chen"})).toBeVisible();expect(screen.getByLabelText("一次性恢复码")).toBeVisible();expect(screen.getByRole("button",{name:"继续使用"})).toBeDisabled();
});
