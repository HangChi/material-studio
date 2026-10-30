import type {Metadata} from "next";
import "./batches.css";
import {Batches} from "../../features/batches/Batches";
export const metadata:Metadata={title:"批量制作 · 素材工坊"};
export default function BatchPage(){return <main id="main-content" className="workspace batch-workspace"><div className="intro batch-intro"><h1>批量制作</h1><p className="intro-copy">每批最多 10 项，可分别选择模板和图片。</p></div><Batches/></main>;}
