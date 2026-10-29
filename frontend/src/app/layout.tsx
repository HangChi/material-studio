import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "../components/BrandMark";
import { SiteNav } from "../components/SiteNav";
import "./globals.css";
export const metadata: Metadata = { title: "素材工坊 · 照片里的日常，值得好好装帧", description: "挑选照片模板，制作肖像、旅行明信片与周末拼贴。" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body>
    <a href="#main-content" className="skip-link">跳转到主要内容</a>
    <header className="site-header"><div className="header-inner"><Link className="brand" href="/" aria-label="素材工坊首页"><BrandMark /><span>素材工坊<span className="brand-caption">MATERIAL STUDIO</span></span></Link><SiteNav /><span className="header-note">照片 · 排版 · 日常</span></div></header>
    {children}
    <footer className="site-footer"><Link href="/" className="footer-brand"><BrandMark />素材工坊</Link><span>把喜欢的照片，做成留得住的作品。</span><span className="footer-imprint">MADE OF YOUR MOMENTS</span></footer>
  </body></html>;
}
