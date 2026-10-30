import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {Account} from "./Account";
it("shows a recovery code only in memory and requires saving before continuing",async()=>{
 const code="temporary-test-recovery-code";vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):Response.json({user:{id:"owner",username:"demo_user"},recoveryCode:code},{status:201})));
 render(<Account/>);fireEvent.click(await screen.findByRole("button",{name:"注册"}));fireEvent.change(screen.getByLabelText("用户名"),{target:{value:"demo_user"}});fireEvent.change(screen.getByLabelText("密码"),{target:{value:"Test-password26!"}});fireEvent.click(screen.getByRole("button",{name:"注册账号"}));
 expect(await screen.findByLabelText("一次性恢复码")).toHaveTextContent(code);expect(screen.getByRole("button",{name:"继续使用"})).toBeDisabled();fireEvent.click(screen.getByRole("checkbox",{name:"我已保存恢复码"}));expect(screen.getByRole("button",{name:"继续使用"})).toBeEnabled();
 expect(JSON.stringify({...localStorage,...sessionStorage})).not.toContain(code);expect(JSON.stringify({...localStorage,...sessionStorage})).not.toContain("Test-password26!");
});
it("does not migrate a visitor unless explicitly selected and confirmed",async()=>{
 const sent:Record<string,unknown>[]=[];vi.stubGlobal("confirm",vi.fn(()=>false));vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{if(url==="/api/session")return Response.json({user:{id:"guest"}});sent.push(JSON.parse(options!.body as string));return Response.json({error:{message:"验证失败"}},{status:401});}));
 render(<Account/>);await screen.findByLabelText("用户名");fireEvent.change(screen.getByLabelText("用户名"),{target:{value:"demo_user"}});fireEvent.change(screen.getByLabelText("密码"),{target:{value:"Test-password26!"}});fireEvent.click(screen.getByText("合并游客记录（可选）"));fireEvent.click(screen.getByRole("checkbox",{name:/合并当前游客/}));fireEvent.click(screen.getByRole("button",{name:"登录账号"}));expect(sent).toHaveLength(0);
 fireEvent.click(screen.getByRole("checkbox",{name:/合并当前游客/}));fireEvent.click(screen.getByRole("button",{name:"登录账号"}));await waitFor(()=>expect(sent).toHaveLength(1));expect(sent[0].mergeGuest).toBe(false);expect(await screen.findByRole("alert")).toHaveTextContent("验证失败");
});
it("reveals passwords without submitting and clears and hides them when modes change",async()=>{
 const fetcher=vi.fn(async()=>Response.json({user:{id:"guest"}}));vi.stubGlobal("fetch",fetcher);render(<Account/>);
 const password=await screen.findByLabelText("密码");fireEvent.change(password,{target:{value:"Test-password26!"}});fireEvent.click(screen.getByRole("button",{name:"显示密码"}));expect(password).toHaveAttribute("type","text");expect(fetcher).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole("button",{name:"注册"}));expect(screen.getByLabelText("密码")).toHaveValue("");expect(screen.getByLabelText("密码")).toHaveAttribute("type","password");expect(screen.getByRole("button",{name:"显示密码"})).toHaveAttribute("aria-pressed","false");
});
it("separates account security actions and clears sensitive input on returning to the overview",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({user:{id:"account",username:"demo_user"}})));render(<Account/>);
 await screen.findByRole("heading",{name:"demo_user"});expect(screen.queryByLabelText("密码")).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"重新生成恢复码"}));fireEvent.change(screen.getByLabelText("密码"),{target:{value:"Test-password26!"}});fireEvent.click(screen.getByRole("button",{name:"返回账号概览"}));expect(screen.queryByLabelText("密码")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"重新生成恢复码"}));expect(screen.getByLabelText("密码")).toHaveValue("");expect(screen.getByLabelText("密码")).toHaveAttribute("type","password");
});

it("uses the new 8–18 range for registration and recovery while preserving legacy login",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({user:{id:"guest"}})));render(<Account/>);
 const login=await screen.findByLabelText("密码");expect(login).toHaveAttribute("minlength","8");expect(login).toHaveAttribute("maxlength","128");
 fireEvent.click(screen.getByRole("button",{name:"注册"}));expect(screen.getByLabelText("密码")).toHaveAttribute("minlength","8");expect(screen.getByLabelText("密码")).toHaveAttribute("maxlength","18");expect(screen.getByLabelText("密码")).toHaveAttribute("placeholder","8～18 位密码");
 fireEvent.click(screen.getByRole("button",{name:"使用恢复码找回"}));expect(screen.getByLabelText("新密码")).toHaveAttribute("minlength","8");expect(screen.getByLabelText("新密码")).toHaveAttribute("maxlength","18");
});
it("keeps optional guest merging collapsed and unselected by default",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>Response.json({user:{id:"guest"}})));render(<Account/>);await screen.findByLabelText("用户名");
 expect(screen.getByRole("checkbox",{name:/合并当前游客/})).not.toBeVisible();fireEvent.click(screen.getByText("合并游客记录（可选）"));expect(screen.getByRole("checkbox",{name:/合并当前游客/})).toBeVisible();expect(screen.getByRole("checkbox",{name:/合并当前游客/})).not.toBeChecked();
});
