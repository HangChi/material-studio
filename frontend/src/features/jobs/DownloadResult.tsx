"use client";
import { useEffect, useRef, useState } from "react";
export function DownloadResult({id,onExpire}:{id:string;onExpire:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const resources=useRef({active:true,controller:null as AbortController|null});
 useEffect(()=>{const state=resources.current;state.active=true;return()=>{state.active=false;state.controller?.abort();};},[]);
 async function download(){
  const state=resources.current;if(state.controller)return;
  const controller=new AbortController();state.controller=controller;setBusy(true);setError("");
  try{
   const response=await fetch(`/api/jobs/${id}/download`,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   if(!state.active)return;
   if(response.status===401){onExpire();return;}
   if(!response.ok){const payload=await response.json();throw new Error(payload.error?.message??"下载失败，请重试");}
   if(!response.headers.get("content-type")?.startsWith("image/png"))throw new Error("下载内容无效，请重试");
   const blob=await response.blob();if(!state.active)return;
   const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`material-${id}.png`;document.body.append(link);link.click();link.remove();
   // A later task gives the browser time to consume the object URL.
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){if(state.active)setError(error instanceof Error?error.message:"下载失败，请重试");}
  finally{state.controller=null;if(state.active)setBusy(false);}
 }
 return <div><button type="button" aria-label={`下载 PNG ${id}`} disabled={busy} onClick={()=>void download()}>{busy?"正在下载…":"下载 PNG"}</button>{error&&<p role="alert">{error}</p>}</div>;
}
