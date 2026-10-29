"use client";
import Image from "next/image";
import { useEffect,useRef,useState } from "react";
type Asset={id:string;mimeType:string;sizeBytes:number;createdAt:string};
export function AssetPicker({onSelect,onClose,excluded=[]}:{onSelect:(id:string)=>void;onClose:()=>void;excluded?:string[]}){
 const [items,setItems]=useState<Asset[]>([]),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 const life=useRef({active:true,controller:null as AbortController|null});
 async function load(next:string|null){
  const state=life.current;if(state.controller)return;const controller=new AbortController();state.controller=controller;setBusy(true);setError("");
  try{
   const response=await fetch(`/api/assets?limit=20${next?`&cursor=${encodeURIComponent(next)}`:""}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   const payload=await response.json();if(!state.active)return;
   if(!response.ok||!Array.isArray(payload.items)||!payload.items.every((item:Asset)=>typeof item.id==="string"&&/^[A-Za-z0-9_-]+$/.test(item.id))||(payload.nextCursor!==null&&typeof payload.nextCursor!=="string"))throw new Error(response.status===401?"访客身份已失效，请刷新页面":"素材库读取失败，请重试");
   setItems(previous=>[...new Map((next?[...previous,...payload.items]:payload.items).map((item:Asset)=>[item.id,item])).values()] as Asset[]);setCursor(payload.nextCursor);
  }catch(error){if(state.active)setError(error instanceof Error?error.message:"素材库读取失败，请重试");}
  finally{state.controller=null;if(state.active)setBusy(false);}
 }
 useEffect(()=>{const state=life.current;state.active=true;void Promise.resolve().then(()=>{if(state.active)void load(null);});return()=>{state.active=false;state.controller?.abort();};},[attempt]);
 return <section className="asset-library" aria-label="选择已有素材" onKeyDown={event=>{if(event.key==="Escape")onClose();}}>
  <div className="library-heading"><h3>我的素材库</h3><button type="button" onClick={onClose}>关闭素材库</button></div><p className="field-help">选择已上传图片，无需再次上传。</p>
  {busy&&<p role="status">正在读取素材…</p>}{error&&<div><p role="alert">{error}</p><button type="button" onClick={()=>cursor?void load(cursor):setAttempt(value=>value+1)}>重新读取素材库</button></div>}
  {!busy&&!error&&items.length===0&&<p>还没有上传素材，请先选择本地图片。</p>}
  <div className="asset-library-grid">{items.map(item=><button type="button" key={item.id} aria-label={`使用素材 ${item.id}`} disabled={excluded.includes(item.id)} onClick={()=>onSelect(item.id)}><Image src={`/api/assets/${item.id}/content`} alt={`素材 ${item.id.slice(0,8)}`} width={160} height={120} unoptimized/><span>{item.id.slice(0,8)} · {Math.ceil(item.sizeBytes/1024)} KB</span>{excluded.includes(item.id)&&<span>其他位置已使用</span>}</button>)}</div>
  {cursor&&<button type="button" disabled={busy} onClick={()=>void load(cursor)}>加载更多素材</button>}
 </section>;
}
