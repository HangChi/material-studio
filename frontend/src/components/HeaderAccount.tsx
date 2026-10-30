"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";

export function HeaderAccount(){
 const pathname=usePathname();
 const [username,setUsername]=useState<string|null>(null);
 useEffect(()=>{
  let active=true,generation=0;
  let controller:AbortController|undefined;
  async function refresh(){
   controller?.abort();
   const serial=++generation;
   controller=new AbortController();
   setUsername(null);
   try{
    const response=await fetch("/api/session",{method:"GET",credentials:"same-origin",cache:"no-store",signal:controller.signal});
    if(!response.ok)return;
    const payload=await response.json();
    if(active&&serial===generation&&typeof payload.user?.username==="string")setUsername(payload.user.username);
   }catch{/* Account access remains available when the read fails. */}
  }
  function changed(event:StorageEvent){if(event.key==="material-visitor-epoch")void refresh();}
  function accountChanged(){void refresh();}
  void refresh();
  window.addEventListener("storage",changed);
  window.addEventListener("material-account-changed",accountChanged);
  return()=>{
   active=false;generation++;controller?.abort();
   window.removeEventListener("storage",changed);
   window.removeEventListener("material-account-changed",accountChanged);
  };
 },[pathname]);
 return <div className="header-account"><Link className={`header-account-link${username?" is-signed-in":""}`} href="/account" aria-current={pathname==="/account"?"page":undefined} aria-label={username?`管理账号：${username}`:undefined} title={username??undefined}>{username??"登录"}</Link></div>;
}
