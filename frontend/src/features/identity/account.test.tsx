import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {Account} from "./Account";
it("shows a recovery code only in memory and requires saving before continuing",async()=>{
 const code="temporary-test-recovery-code";vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/session"?Response.json({user:{id:"owner"}}):Response.json({user:{id:"owner",username:"demo_user"},recoveryCode:code},{status:201})));
 render(<Account/>);fireEvent.click(await screen.findByRole("button",{name:"注册并绑定"}));fireEvent.change(screen.getByLabelText("用户名"),{target:{value:"demo_user"}});fireEvent.change(screen.getByLabelText("密码"),{target:{value:"Only-test-password-2026!"}});fireEvent.click(screen.getByRole("button",{name:"注册并绑定当前访客"}));
 expect(await screen.findByLabelText("一次性恢复码")).toHaveTextContent(code);expect(screen.getByRole("button",{name:"继续使用"})).toBeDisabled();fireEvent.click(screen.getByRole("checkbox",{name:"我已保存恢复码"}));expect(screen.getByRole("button",{name:"继续使用"})).toBeEnabled();
 expect(JSON.stringify({...localStorage,...sessionStorage})).not.toContain(code);expect(JSON.stringify({...localStorage,...sessionStorage})).not.toContain("Only-test-password");
});
it("does not migrate a visitor unless explicitly selected and confirmed",async()=>{
 const sent:Record<string,unknown>[]=[];vi.stubGlobal("confirm",vi.fn(()=>false));vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{if(url==="/api/session")return Response.json({user:{id:"guest"}});sent.push(JSON.parse(options!.body as string));return Response.json({error:{message:"验证失败"}},{status:401});}));
 render(<Account/>);await screen.findByLabelText("用户名");fireEvent.change(screen.getByLabelText("用户名"),{target:{value:"demo_user"}});fireEvent.change(screen.getByLabelText("密码"),{target:{value:"Only-test-password-2026!"}});fireEvent.click(screen.getByRole("checkbox",{name:/迁移当前访客/}));fireEvent.click(screen.getByRole("button",{name:"登录账号"}));expect(sent).toHaveLength(0);
 fireEvent.click(screen.getByRole("checkbox",{name:/迁移当前访客/}));fireEvent.click(screen.getByRole("button",{name:"登录账号"}));await waitFor(()=>expect(sent).toHaveLength(1));expect(sent[0].mergeGuest).toBe(false);expect(await screen.findByRole("alert")).toHaveTextContent("验证失败");
});
