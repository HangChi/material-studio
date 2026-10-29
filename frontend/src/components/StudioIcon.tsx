type Kind = "templates" | "history" | "upload" | "sliders" | "library" | "arrow";
const paths: Record<Kind, string> = {
  templates: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  history: "M5 3h14v18H5zM9 7h6M9 11h6M9 15h3",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  sliders: "M3 6h7m4 0h7M3 18h11m4 0h3M10 3v6m4 6v6",
  library: "M3 6h7l2 3h9v12H3zM7 6V3h14v3",
  arrow: "M4 12h16m-6-6 6 6-6 6",
};
export function StudioIcon({ name, className = "" }: { name: Kind; className?: string }) {
  return <svg className={`studio-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
