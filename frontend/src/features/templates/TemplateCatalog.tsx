"use client";

import { StudioIcon } from "../../components/StudioIcon";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { readJson, type Category, type Template } from "./types";

type CatalogState = { status: "loading" | "success" | "error"; categories: Category[]; templates: Template[] };

export function TemplateCatalog() {
  const [category, setCategory] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: "loading", categories: [], templates: [] });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const query = category ? `?categoryId=${encodeURIComponent(category)}` : "";
    Promise.all([
      readJson<{ items: Category[] }>("/api/template-categories", controller.signal),
      readJson<{ items: Template[] }>(`/api/templates${query}`, controller.signal),
    ]).then(([categories, templates]) => {
      if (active) setState({ status: "success", categories: categories.items, templates: templates.items });
    }).catch(() => { if (active) setState(previous => ({ ...previous, status: "error" })); });
    return () => { active = false; controller.abort(); };
  }, [category, attempt]);
  function choose(next: string) {
    if (next === category) return;
    setState(previous => ({ ...previous, status: "loading" }));
    setCategory(next);
  }
  function retry() {
    setState(previous => ({ ...previous, status: "loading" }));
    setAttempt(previous => previous + 1);
  }
  return <main id="main-content" className="workspace">
    <section className="intro catalog-intro">
      <h1>把照片做成作品</h1>
      <p className="intro-copy">选择模板，放入照片，调整好构图后保存。</p>
    </section>
    <section className="library-section" id="template-library" aria-label="模板浏览">
      <div className="catalog-toolbar">
        <div className="categories" role="group" aria-label="模板分类">
          <button aria-pressed={category === ""} onClick={() => choose("")}>全部模板</button>
          {state.categories.map(item => <button key={item.id} aria-pressed={category === item.id} onClick={() => choose(item.id)}>{item.name}</button>)}
        </div>
        {state.status === "success" && <p className="result-count">{state.templates.length} 个模板</p>}
      </div>
      {state.status === "loading" && <div className="state-panel" role="status">正在加载模板…</div>}
      {state.status === "error" && <div className="state-panel"><p role="alert">暂时无法加载模板，请检查连接后重试。</p><button className="primary" onClick={retry}>重新加载</button></div>}
      {state.status === "success" && state.templates.length === 0 && <div className="state-panel"><h2>这个分类还没有模板</h2><p>换个分类，看看其他样式。</p></div>}
      {state.status === "success" && <div className="template-grid" aria-label="模板列表">
        {state.templates.map(template => <Link className="template-card" key={template.id} href={`/templates/${template.id}`}>
          <div className="cover"><Image src={template.coverUrl} alt={`${template.title}示例`} width={960} height={720} unoptimized /></div>
          <div className="card-content"><p className="card-category">{state.categories.find(c => c.id === template.categoryId)?.name}</p>
            <h2>{template.title}</h2><p>{template.description}</p>
            <div className="card-foot"><span>需要 {template.requiredImageCount} 张图片</span><span className="card-action">开始制作 <StudioIcon name="arrow" /></span></div>
          </div>
        </Link>)}
      </div>}
    </section>
  </main>;
}
