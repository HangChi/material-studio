"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SiteNav() {
  const pathname = usePathname();
  const inHistory = pathname === "/history";
  return <nav aria-label="主导航"><Link href="/" aria-current={pathname === "/" || pathname.startsWith("/templates/") ? "page" : undefined}>模板库</Link><Link href="/history" aria-current={inHistory ? "page" : undefined}>制作记录</Link><Link href="/batches" aria-current={pathname==="/batches"?"page":undefined}>批量制作</Link><Link href="/account" aria-current={pathname==="/account"?"page":undefined}>账号</Link></nav>;
}
