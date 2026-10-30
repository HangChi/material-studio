import type {Metadata} from "next";
import "./batches.css";
import {Batches} from "../../features/batches/Batches";
export const metadata:Metadata={title:"批量制作 · 素材工坊"};
export default function BatchPage(){return <main id="main-content" className="workspace batch-workspace"><div className="intro batch-intro"><h1>批量制作</h1><p className="intro-copy">把多份创作一起安排好，制作进度随时可查看。</p></div><Batches/></main>;}
