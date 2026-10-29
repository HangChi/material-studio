import type { Metadata } from "next";
import { History } from "../../features/jobs/History";
export const metadata:Metadata={title:"制作记录 · 素材工坊"};
export default function HistoryPage(){return <main className="workspace" id="main-content"><div className="intro"><p className="eyebrow">YOUR COLLECTION / 作品收藏室</p><h1>制作记录<span className="heading-dot">。</span></h1><p className="intro-copy">做好的、正在做的，都放在这里。查看进度，也可以接着编辑。</p></div><History/></main>;}
