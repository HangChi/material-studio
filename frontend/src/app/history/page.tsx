import type { Metadata } from "next";
import { History } from "../../features/jobs/History";
export const metadata:Metadata={title:"制作记录 · 素材工坊"};
export default function HistoryPage(){return <main className="workspace" id="main-content"><div className="intro"><p className="eyebrow">MATERIAL STUDIO / YOUR CREATIONS</p><h1>每一次创作，<span>都有迹可循。</span></h1><p className="intro-copy">查看制作进展，让完成的作品留在这里。</p></div><History/></main>;}
