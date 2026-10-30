type Kind = "search" | "star" | "hide" | "select" | "tag" | "chevron" | "templates" | "history" | "upload" | "sliders" | "library" | "arrow" | "edit" | "download" | "repeat";
const paths: Record<Kind, string> = {
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z",
  hide: "m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9 5.5c1-.3 2-.5 3-.5 6 0 10 7 10 7s-1.5 2.6-4 4.6M6 6.5C3.5 8.4 2 12 2 12s4 7 10 7c1.3 0 2.6-.3 3.7-.8",
  select: "M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M8 12l3 3 5-6",
  tag: "M3 3h8l10 10-8 8L3 11zM7 7h.01",
  chevron: "m6 9 6 6 6-6",
  templates: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  history: "M5 3h14v18H5zM9 7h6M9 11h6M9 15h3",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  sliders: "M3 6h7m4 0h7M3 18h11m4 0h3M10 3v6m4 6v6",
  library: "M3 6h7l2 3h9v12H3zM7 6V3h14v3",
  edit: "M14 4 20 10M3 21l5-1L21 7l-5-5L3 15z",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  repeat: "M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5",
  arrow: "M4 12h16m-6-6 6 6-6 6",
};
export function StudioIcon({ name, className = "" }: { name: Kind; className?: string }) {
  return <svg className={`studio-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
