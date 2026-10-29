"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
type Identity={status:"loading"|"switching"|"error"|"ready";id:string|null};
export function SessionGate({children,allowSwitch=false}:{children:(owner:string)=>ReactNode;allowSwitch?:boolean}){
 const [identity,setIdentity]=useState<Identity>({status:"loading",id:null});
 const [attempt,setAttempt]=useState(0);const lifecycle=useRef({generation:0,switchRequest:null as AbortController|null});const switching=useRef(false);
 useEffect(()=>{
  const state=lifecycle.current,serial=++state.generation,controller=new AbortController();
  fetch("/api/session",{method:"POST",credentials:"same-origin",signal:controller.signal}).then(async response=>{
   const payload=await response.json();if(!response.ok||typeof payload.user?.id!=="string")throw new Error("Invalid identity");
   if(state.generation===serial)setIdentity({status:"ready",id:payload.user.id});
  }).catch(()=>{if(state.generation===serial)setIdentity({status:"error",id:null});});
  return()=>{state.generation++;controller.abort();state.switchRequest?.abort();};
 },[attempt]);
 useEffect(()=>{
  function changed(event:StorageEvent){
   if(event.key!=="material-visitor-epoch")return;
   lifecycle.current.generation++;lifecycle.current.switchRequest?.abort();
   setIdentity({status:"loading",id:null});setAttempt(value=>value+1);
  }
  window.addEventListener("storage",changed);return()=>window.removeEventListener("storage",changed);
 },[]);
 async function switchVisitor(){
  if(switching.current||identity.status!=="ready")return;
  switching.current=true;const state=lifecycle.current,serial=++state.generation,controller=new AbortController();state.switchRequest=controller;
  setIdentity({status:"switching",id:null});
  try{
   const revoked=await fetch("/api/session",{method:"DELETE",credentials:"same-origin",signal:controller.signal});if(!revoked.ok)throw new Error("Revoke failed");
   if(serial!==state.generation)return;
   const response=await fetch("/api/session",{method:"POST",credentials:"same-origin",signal:controller.signal});const payload=await response.json();
   if(!response.ok||typeof payload.user?.id!=="string")throw new Error("Invalid identity");
   if(serial===state.generation){
    setIdentity({status:"ready",id:payload.user.id});
    try { localStorage.setItem("material-visitor-epoch",crypto.randomUUID()); }catch { /* Private storage may be disabled; same-page isolation still works. */ }
   }
  }catch{if(serial===state.generation)setIdentity({status:"error",id:null});}
  finally{switching.current=false;if(state.switchRequest===controller)state.switchRequest=null;}
 }
 if(identity.status==="loading"||identity.status==="switching")return <p role="status">{identity.status==="switching"?"正在切换访客…":"正在建立访客身份…"}</p>;
 if(identity.status==="error"||!identity.id)return <div><p role="alert">暂时无法建立访客身份，请重试。</p><button type="button" onClick={()=>{setIdentity({status:"loading",id:null});setAttempt(value=>value+1);}}>重新建立访客身份</button></div>;
 return <>{allowSwitch&&<div className="visitor-panel"><div><strong>当前访客 · {identity.id.slice(0,8)}</strong><p>切换后无法找回原访客记录，后台制作仍会继续。请先保存需要的结果。</p></div><button type="button" onClick={()=>void switchVisitor()}>切换为新访客</button></div>}{children(identity.id)}</>;
}
