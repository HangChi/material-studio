"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudioIcon } from "./StudioIcon";
export function SiteNav() {
  const pathname = usePathname();
  const inHistory = pathname === "/history";
  return <nav aria-label="主导航"><Link href="/" aria-current={pathname === "/" || pathname.startsWith("/templates/") ? "page" : undefined}><StudioIcon name="templates" />模板库</Link><Link href="/history" aria-current={inHistory ? "page" : undefined}><StudioIcon name="history" />制作记录</Link><Link href="/batches" aria-current={pathname==="/batches"?"page":undefined}><StudioIcon name="templates" />批量制作</Link><Link href="/account" aria-current={pathname==="/account"?"page":undefined}><StudioIcon name="history" />账号</Link></nav>;
}
