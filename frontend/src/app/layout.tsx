import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "素材工坊 · 模板库", description: "浏览图片模板，发现照片的新样式。" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body>
    <a href="#main-content" className="skip-link">跳转到主要内容</a>
    <header className="site-header"><div className="header-inner"><Link className="brand" href="/" aria-label="素材工坊首页"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>素材工坊<span className="brand-caption">MATERIAL STUDIO</span></span></Link><nav aria-label="主导航"><Link href="/">模板库</Link><Link href="/history">制作记录</Link></nav></div></header>
    {children}
    <footer className="site-footer">素材工坊 <span>图片模板与创意样张</span></footer>
  </body></html>;
}
