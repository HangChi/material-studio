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
      <div className="intro-text"><p className="eyebrow"><span className="tiny-rule" /> 你的照片制作工作室</p>
        <h1>照片里的日常，<br /><span>值得好好装帧。</span></h1>
        <p className="intro-copy">一张肖像、一封旅途来信，或是周末的几个片段。<br className="desktop-break" />选个样式，把相册里的喜欢留在画面上。</p>
        <a className="intro-link" href="#template-library">挑选一个模板 <StudioIcon name="arrow" /></a>
      </div>
      <div className="studio-still" aria-hidden="true"><div className="still-paper still-back"><span>WEEKEND NOTES</span><div className="still-window"><i /><b /></div></div><div className="still-paper still-front"><div className="still-portrait"><i /><b /><em /></div><span>日光，刚刚好。</span><small>A LITTLE MOMENT / 2026</small></div><div className="still-caption">相片有了位置，回忆有了形状。</div></div>
    </section>
    <section className="library-section" id="template-library" aria-label="模板浏览">
      <div className="section-heading"><div><p className="eyebrow">THE TEMPLATE COLLECTION</p><h2><StudioIcon name="templates" />从喜欢的样式开始</h2></div><p>选模板 · 放照片 · 做成作品</p></div>
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
          <div className="cover"><span className="cover-label">{template.requiredImageCount === 1 ? "单幅装帧" : template.requiredImageCount === 2 ? "双图明信片" : "多图拼贴"}</span><Image src={template.coverUrl} alt={`${template.title}示例`} width={960} height={720} unoptimized /></div>
          <div className="card-content"><p className="card-category">{state.categories.find(c => c.id === template.categoryId)?.name}</p>
            <h2>{template.title}<StudioIcon name="arrow" /></h2><p>{template.description}</p>
            <div className="card-foot"><span>需要 {template.requiredImageCount} 张图片</span><span className="card-action">查看模板</span></div>
          </div>
        </Link>)}
      </div>}
    </section>
  </main>;
}
