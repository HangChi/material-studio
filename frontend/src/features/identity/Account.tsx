"use client";
import {useEffect,useRef,useState} from "react";
import {StudioIcon} from "../../components/StudioIcon";
import {SessionGate} from "./SessionGate";
type Mode="login"|"register"|"recover"|"rotate";
type Outcome={username:string;code?:string};
export function Account(){return <SessionGate>{(owner,username)=><AccountBody key={owner} username={username}/>}</SessionGate>;}
function AccountBody({username}:{username?:string}){
 const [mode,setMode]=useState<Mode>("login"),[name,setName]=useState(username??""),[password,setPassword]=useState(""),[recovery,setRecovery]=useState(""),[merge,setMerge]=useState(false),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[outcome,setOutcome]=useState<Outcome|null>(null);
 const life=useRef({active:true,controller:null as AbortController|null});useEffect(()=>{const state=life.current;state.active=true;return()=>{state.active=false;state.controller?.abort();};},[]);
 function notify(){try{localStorage.setItem("material-visitor-epoch",crypto.randomUUID());}catch{/* Other tabs must refresh if storage is unavailable. */}}
 async function submit(){
  const state=life.current;if(state.controller)return;if(mode==="login"&&merge&&!window.confirm("将当前访客的素材、终态作品和批次迁移至账号；未完成任务或提交标识冲突会拒绝迁移。确定迁移并登录吗？"))return;
  const c=new AbortController();state.controller=c;setBusy(true);setError("");
  const body=mode==="rotate"?{password}:{username:name,password,...(mode==="login"?{mergeGuest:merge}:{}),...(mode==="recover"?{recoveryCode:recovery}:{})};
  try{const r=await fetch(`/api/account/${mode==="rotate"?"recovery-code":mode}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:c.signal});const p=await r.json();if(!state.active)return;if(!r.ok||typeof p.user?.username!=="string")throw new Error(p.error?.message??"账号操作失败；若注册结果未确认，可使用相同用户名和密码登录后重新生成恢复码。");
   setPassword("");setRecovery("");setSaved(false);setOutcome({username:p.user.username,code:typeof p.recoveryCode==="string"?p.recoveryCode:undefined});notify();
  }catch(e){if(state.active)setError(e instanceof Error?e.message:"账号服务暂时不可用，请重试");}finally{state.controller=null;if(state.active)setBusy(false);}
 }
 async function logout(){const state=life.current;if(state.controller)return;const c=new AbortController();state.controller=c;setBusy(true);setError("");try{const r=await fetch("/api/session",{method:"DELETE",signal:c.signal});if(!r.ok)throw new Error();if(state.active){notify();window.location.reload();}}catch{if(state.active)setError("退出暂时失败，请重试。");}finally{state.controller=null;if(state.active)setBusy(false);}}
 function changeMode(next:Mode){setMode(next);setError("");setPassword("");setRecovery("");}
 const titles={login:"欢迎回来",register:"为你的创作安个家",recover:"找回你的账号",rotate:"更新恢复码"};
 const descriptions={login:"登录后，继续整理你的素材与作品。",register:"绑定当前访客，保留已经开始的创作。",recover:"使用离线保存的恢复码，设置新的登录密码。",rotate:"验证当前密码后，生成一份新的恢复码。"};
 const isOverview=!!username&&mode!=="recover"&&mode!=="rotate";
 return <div className="account-layout">
  <aside className="account-story" aria-label="账号用途">
   <p className="eyebrow">你的私人创作档案</p><h2>每一份创作，<br/>都有自己的归处。</h2>
   <p className="account-story-copy">从第一张素材到最后一份作品，<br/>换个设备，也能接着创作。</p>
   <div className="account-art" aria-hidden="true"><div className="account-photo photo-back"><StudioIcon name="templates"/></div><div className="account-photo photo-front"><div className="account-portrait"><span/><i/></div><span className="photo-caption">MATERIAL STUDIO · 我的创作</span></div><span className="account-art-seal"><StudioIcon name="history"/></span></div>
   <ul className="account-benefits"><li><StudioIcon name="library"/><span>素材、作品与批次随账号保留</span></li><li><StudioIcon name="repeat"/><span>使用恢复码，重新找回访问权</span></li></ul>
   <p className="account-footnote">本机未提交的草稿仅保留在当前浏览器。</p>
  </aside>
  <section className="account-panel" aria-label="账号管理" aria-busy={busy}>
  {outcome?<div className="account-outcome"><span className="account-success-mark" aria-hidden="true">✓</span><p className="eyebrow">{outcome.code?"请完成最后一步":"登录成功"}</p><h2>已登录 {outcome.username}</h2>
   {outcome.code?<><p className="account-description">请保存这份恢复码</p><p className="account-help">仅显示这一次。密码和恢复码都丢失时，将无法找回账号。</p><output className="recovery-code" aria-label="一次性恢复码">{outcome.code}</output><label className="checkbox-label account-save"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>我已保存恢复码</label></>:<p className="account-description">你的素材与作品已就绪，可以继续创作了。</p>}
   <button className="primary account-submit" disabled={!!outcome.code&&!saved} onClick={()=>window.location.reload()}>继续使用<StudioIcon name="arrow"/></button>
  </div>:<>
   {isOverview?<>
    <div className="account-profile"><span className="account-avatar" aria-hidden="true">{username.slice(0,1).toUpperCase()}</span><div><span className="account-status">已登录</span><h2>{username}</h2></div></div>
    <p className="account-description">素材与作品，已经有了自己的归处。</p><a className="account-work-link" href="/history">查看我的制作记录<StudioIcon name="arrow"/></a>
    <div className="account-security"><h3>账号安全</h3><p className="account-help">妥善保管恢复码，换设备也能找回账号。</p>
     <button className="account-security-row" aria-labelledby="account-rotate-title" aria-describedby="account-rotate-help" disabled={busy} onClick={()=>changeMode("rotate")}><span><strong id="account-rotate-title">重新生成恢复码</strong><small id="account-rotate-help">旧恢复码将失效，请保存新的一份</small></span><StudioIcon name="arrow"/></button>
     <button className="account-security-row" aria-labelledby="account-reset-title" aria-describedby="account-reset-help" disabled={busy} onClick={()=>changeMode("recover")}><span><strong id="account-reset-title">使用恢复码重置密码</strong><small id="account-reset-help">已有恢复码时，可重新设置密码</small></span><StudioIcon name="arrow"/></button>
    </div><div className="account-signout"><p>退出后，账号记录仍会保留。</p><button disabled={busy} onClick={()=>void logout()}>{busy?"正在退出…":"退出账号"}</button></div>
   </>:<>
    {username?<button className="account-back" aria-label="返回账号概览" disabled={busy} onClick={()=>changeMode("login")}>← 返回账号概览</button>:mode==="recover"?<button className="account-back" disabled={busy} onClick={()=>changeMode("login")}>← 返回登录</button>:<div className="account-tabs" aria-label="账号访问方式">{[["login","登录"],["register","注册并绑定"]].map(([value,label])=><button key={value} disabled={busy} aria-pressed={mode===value} onClick={()=>changeMode(value as Mode)}>{label}</button>)}</div>}
    <div className="account-form-heading"><h2>{titles[mode]}</h2><p className="account-description">{descriptions[mode]}</p></div>
    <form onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={busy}>
     {mode!=="rotate"&&<div className="account-field"><label htmlFor="account-name">用户名</label><input id="account-name" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z0-9_]{3,32}" aria-describedby="account-name-help" placeholder="例如 studio_chen" value={name} onChange={e=>setName(e.target.value)}/><p id="account-name-help" className="account-help">3～32 位字母、数字或下划线</p></div>}
     <PasswordField key={mode} label={mode==="recover"?"新密码":"密码"} value={password} onChange={setPassword} fresh={mode==="register"||mode==="recover"}/>
     {mode==="recover"&&<div className="account-field"><label htmlFor="account-recovery">恢复码</label><input id="account-recovery" type="password" autoComplete="off" required value={recovery} placeholder="输入已保存的完整恢复码" onChange={e=>setRecovery(e.target.value)}/></div>}
     {mode==="login"&&<div className="account-transfer"><label className="checkbox-label"><input type="checkbox" checked={merge} onChange={e=>setMerge(e.target.checked)}/>迁移当前访客的素材、终态作品和批次</label><p className="account-help">仅在需要合并时勾选。请先完成或取消访客的未结束任务；不勾选则不会将访客记录加入账号。</p></div>}
     {mode==="register"&&<div className="account-note"><StudioIcon name="library"/><p>现有素材、任务与批次都会保留。注册后，请保存仅显示一次的恢复码。</p></div>}
     {mode==="rotate"&&<div className="account-note"><StudioIcon name="repeat"/><p>生成后旧恢复码立即失效，请将新恢复码保存在安全的地方。</p></div>}
     {error&&<p className="account-error" role="alert">{error}</p>}
     <button className="primary account-submit" type="submit">{busy?"正在处理…":({login:"登录账号",register:"注册并绑定当前访客",recover:"重置密码并更新恢复码",rotate:"验证密码并生成新恢复码"})[mode]}{!busy&&<StudioIcon name="arrow"/>}</button>
    </fieldset></form>
    {!username&&mode!=="recover"&&<div className="account-recover"><span>忘记密码了？</span><button disabled={busy} onClick={()=>changeMode("recover")}>使用恢复码找回</button></div>}
   </>}
   {isOverview&&error&&<p className="account-error" role="alert">{error}</p>}
  </>}
  </section>
 </div>;
}
function PasswordField({label,value,onChange,fresh}:{label:string;value:string;onChange:(value:string)=>void;fresh:boolean}){
 const [visible,setVisible]=useState(false);
 return <div className="account-field"><label htmlFor="account-password">{label}</label><div className="account-password"><input id="account-password" type={visible?"text":"password"} autoComplete={fresh?"new-password":"current-password"} required minLength={12} maxLength={128} aria-describedby="account-password-help" placeholder={fresh?"设置至少 12 位密码":"输入账号密码"} value={value} onChange={e=>onChange(e.target.value)}/><button type="button" aria-label={visible?"隐藏密码":"显示密码"} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?"隐藏":"显示"}</button></div><p id="account-password-help" className="account-help">12～128 位字符，支持密码管理器自动填充</p></div>;
}
