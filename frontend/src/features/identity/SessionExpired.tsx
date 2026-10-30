import Link from "next/link";

export function SessionExpired(){
 return <div className="state-panel session-expired"><p role="alert">当前会话已失效。若之前登录过账号，请重新登录后查看原作品。</p><Link className="text-action" href="/account">重新登录</Link><p>游客记录依赖原浏览器身份，重新建立游客无法找回旧记录。</p></div>;
}
