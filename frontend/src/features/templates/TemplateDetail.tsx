"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { readJson, type Template } from "./types";

type DetailState = { status: "loading" | "error" | "not-found"; template?: never } | { status: "success"; template: Template };
export function TemplateDetail({ id }: { id: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    readJson<Template>(`/api/templates/${encodeURIComponent(id)}`, controller.signal)
      .then(template => { if (active) setState({ status: "success", template }); })
      .catch(error => { if (active) setState({ status: error instanceof Error && error.message === "404" ? "not-found" : "error" }); });
    return () => { active = false; controller.abort(); };
  }, [id, attempt]);
  return <main id="main-content" className="workspace detail-workspace">
    <Link href="/" className="back-link">← 返回模板库</Link>
    {state.status === "loading" && <div className="state-panel" role="status">正在加载模板…</div>}
    {state.status === "not-found" && <div className="state-panel"><h1>模板不存在</h1><p>这个模板可能已移除，返回模板库看看其他样式。</p></div>}
    {state.status === "error" && <div className="state-panel"><p role="alert">暂时无法加载模板，请检查连接后重试。</p><button className="primary" onClick={() => { setState({ status: "loading" }); setAttempt(value => value + 1); }}>重新加载</button></div>}
    {state.status === "success" && <article className="detail-grid">
      <div className="detail-preview"><Image src={state.template.coverUrl} alt={`${state.template.title}示例`} width={960} height={720} unoptimized priority /><p>模板样张</p></div>
      <div className="detail-info"><p className="eyebrow">TEMPLATE / 图片模板</p><h1>{state.template.title}</h1><p className="description">{state.template.description}</p>
        <section aria-labelledby="requirements"><h2 id="requirements">素材要求</h2><dl className="requirements">
          <div><dt>图片数量</dt><dd>{state.template.requiredImageCount} 张图片</dd></div>
          <div><dt>支持格式</dt><dd>{state.template.acceptedMimeTypes.map(mime => ({ "image/jpeg": "JPEG", "image/png": "PNG" })[mime] ?? mime).join("、")}</dd></div>
          <div><dt>文件大小</dt><dd>每张不超过 {state.template.maxFileSizeBytes / 1048576} MiB</dd></div>
        </dl></section>
        <p className="detail-tip">挑选清晰的图片，让画面里的每个细节都被保留。</p>
      </div>
    </article>}
  </main>;
}
