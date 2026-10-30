import "./history.css";
import type { Metadata } from "next";
import { History } from "../../features/jobs/History";
export const metadata:Metadata={title:"制作记录 · 素材工坊"};
export default function HistoryPage(){return <main className="workspace history-workspace" id="main-content"><div className="intro"><h1>制作记录</h1><p className="intro-copy">查看制作进度，编辑或下载已完成的作品。</p></div><History/></main>;}
