"use client";
import {useEffect,useRef,useState} from "react";
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
 if(outcome)return <section className="account-panel"><h2>已登录 {outcome.username}</h2>{outcome.code&&<><p>恢复码仅显示这一次，请离线保存。密码和恢复码都丢失时将无法找回账号。</p><output className="recovery-code" aria-label="一次性恢复码">{outcome.code}</output><label className="checkbox-label"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>我已保存恢复码</label></>}<button className="primary" disabled={!!outcome.code&&!saved} onClick={()=>window.location.reload()}>继续使用</button></section>;
 return <section className="account-panel">{username?<><h2>当前账号：{username}</h2><p>账号下已上传素材、制作记录和批次可跨设备访问；本机未提交草稿不会自动同步。</p><div className="job-actions"><button disabled={busy} onClick={()=>void logout()}>退出账号</button><button disabled={busy} onClick={()=>{setMode("rotate");setError("");}}>重新生成恢复码</button><button disabled={busy} onClick={()=>{setMode("recover");setError("");}}>使用恢复码重置密码</button></div></>:<div className="job-actions">{[["login","登录"],["register","注册并绑定"],["recover","使用恢复码找回"]].map(([value,label])=><button key={value} disabled={busy} aria-pressed={mode===value} onClick={()=>{setMode(value as Mode);setError("");setPassword("");setRecovery("");}}>{label}</button>)}</div>}
 {(!username||mode==="recover"||mode==="rotate")&&<form onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={busy}>{mode!=="rotate"&&<label>用户名<input autoComplete="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9_]{3,32}" value={name} onChange={e=>setName(e.target.value)}/></label>}<label>{mode==="recover"?"新密码":"密码"}<input type="password" autoComplete={mode==="register"||mode==="recover"?"new-password":"current-password"} required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>{mode==="recover"&&<label>恢复码<input type="password" autoComplete="off" required value={recovery} onChange={e=>setRecovery(e.target.value)}/></label>}
 {mode==="login"&&<><label className="checkbox-label"><input type="checkbox" checked={merge} onChange={e=>setMerge(e.target.checked)}/>迁移当前访客的素材、终态作品和批次</label><p>不迁移时，当前匿名记录不会进入账号；请先绑定账号或保存所需结果。迁移前需完成或取消访客的未结束任务。</p></>}
 {mode==="register"&&<p>注册会绑定当前访客，保留现有素材、任务和批次。请使用新用户名，并保存接下来显示的恢复码。</p>}
 <button className="primary" type="submit">{busy?"正在处理…":({login:"登录账号",register:"注册并绑定当前访客",recover:"重置密码并更新恢复码",rotate:"验证密码并生成新恢复码"})[mode]}</button></fieldset></form>}{error&&<p role="alert">{error}</p>}</section>;
}
