"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type ReactNode} from "react";

type Identity={status:"loading"|"signing-out"|"error"|"ready";id:string|null;username?:string};
export function SessionGate({children,showIdentity=false}:{children:(owner:string,username?:string)=>ReactNode;showIdentity?:boolean}){
 const [identity,setIdentity]=useState<Identity>({status:"loading",id:null});
 const [attempt,setAttempt]=useState(0);
 const lifecycle=useRef({generation:0,signOutRequest:null as AbortController|null});
 useEffect(()=>{
  const state=lifecycle.current,serial=++state.generation,controller=new AbortController();
  fetch("/api/session",{method:"POST",credentials:"same-origin",signal:controller.signal}).then(async response=>{
   const payload=await response.json();
   if(!response.ok||typeof payload.user?.id!=="string")throw new Error("Invalid identity");
   if(state.generation===serial)setIdentity({status:"ready",id:payload.user.id,username:typeof payload.user.username==="string"?payload.user.username:undefined});
  }).catch(()=>{if(state.generation===serial)setIdentity({status:"error",id:null});});
  return()=>{state.generation++;controller.abort();state.signOutRequest?.abort();};
 },[attempt]);
 useEffect(()=>{
  function changed(event:StorageEvent){
   if(event.key!=="material-visitor-epoch")return;
   lifecycle.current.generation++;
   lifecycle.current.signOutRequest?.abort();
   setIdentity({status:"loading",id:null});setAttempt(value=>value+1);
  }
  window.addEventListener("storage",changed);
  return()=>window.removeEventListener("storage",changed);
 },[]);
 async function signOut(){
  const state=lifecycle.current;
  if(state.signOutRequest||identity.status!=="ready"||!identity.username)return;
  const serial=++state.generation,controller=new AbortController();
  state.signOutRequest=controller;
  setIdentity({status:"signing-out",id:null});
  try{
   const response=await fetch("/api/session",{method:"DELETE",credentials:"same-origin",signal:controller.signal});
   if(serial!==state.generation)return;
   if(!response.ok)throw new Error("Sign out failed");
   try{localStorage.setItem("material-visitor-epoch",crypto.randomUUID());}catch{/* Same-page cleanup remains effective without browser storage. */}
   setIdentity({status:"loading",id:null});setAttempt(value=>value+1);
  }catch{if(serial===state.generation)setIdentity({status:"error",id:null});}
  finally{if(state.signOutRequest===controller)state.signOutRequest=null;}
 }
 if(identity.status==="loading"||identity.status==="signing-out")return <p role="status">{identity.status==="signing-out"?"正在退出登录…":"正在连接…"}</p>;
 if(identity.status==="error"||!identity.id)return <div><p role="alert">暂时无法确认当前身份，请重新连接。现有作品不会因此被删除。</p><button type="button" onClick={()=>{setIdentity({status:"loading",id:null});setAttempt(value=>value+1);}}>重新连接</button></div>;
 return <>{showIdentity&&<section className="visitor-panel identity-panel" aria-label="当前身份">
  <div className="identity-copy"><strong>{identity.username??"无需登录即可制作"}</strong><p>{identity.username?"作品已保存在账号中，可在其他设备登录查看。":"注册账号可保留当前作品，并在其他设备继续查看。游客记录与当前浏览器身份关联。"}</p></div>
  <div className="identity-actions">{identity.username?<><Link href="/account">管理账号</Link><button type="button" onClick={()=>void signOut()}>退出登录</button></>:<Link className="identity-account-link" href="/account">登录 / 注册</Link>}</div>
 </section>}{children(identity.id,identity.username)}</>;
}
