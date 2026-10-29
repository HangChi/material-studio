export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M10 12V6h26v26h-6" stroke="currentColor" strokeWidth="2.5"/><path d="M6 18h24v24H6z" fill="currentColor"/><path d="M12 24h12v12H12z" fill="var(--paper, white)"/><path d="m12 33 4-5 3 3 2-2 3 4" stroke="currentColor" strokeWidth="1.5"/><circle cx="21" cy="27" r="1.4" fill="currentColor"/><path d="M38 12h6M41 9v6" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
