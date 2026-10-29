import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "../components/BrandMark";
import { SiteNav } from "../components/SiteNav";
import "./globals.css";
export const metadata: Metadata = { title: "素材工坊 · 照片制作工具", description: "挑选照片模板，制作肖像、旅行明信片与周末拼贴。" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body>
    <a href="#main-content" className="skip-link">跳转到主要内容</a>
    <header className="site-header"><div className="header-inner"><Link className="brand" href="/" aria-label="素材工坊首页"><BrandMark /><span>素材工坊</span></Link><SiteNav /></div></header>
    {children}
    <footer className="site-footer"><span className="footer-name">素材工坊</span><span>肖像、明信片与照片拼贴</span></footer>
  </body></html>;
}
