"use client";
import Image from "next/image";
import { useState } from "react";

export function ResultPreview({url,title}:{url:string;title:string}){
 const [attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false),[loading,setLoading]=useState(false);
 if(failed)return <div className="result-preview result-preview-error"><p role="alert">结果图片加载失败，制作状态仍为成功。</p><button type="button" onClick={()=>{setAttempt(value=>value+1);setFailed(false);setLoading(true);}}>重新加载图片</button></div>;
 return <div className="result-preview">
  {loading&&<p role="status">正在重新加载图片…</p>}
  <Image key={attempt} className="job-result" unoptimized src={attempt===0?url:`${url}?previewAttempt=${attempt}`} alt={`${title}制作结果`} width={960} height={720}
   onError={()=>{setFailed(true);setLoading(false);}} onLoad={()=>setLoading(false)}/>
 </div>;
}
