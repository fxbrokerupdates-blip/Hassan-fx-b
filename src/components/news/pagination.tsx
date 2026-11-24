import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, total, pageSize, basePath, params }: {
  page: number; total: number; pageSize: number; basePath: string; params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== "page" && sp.set(k, v));
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };
  const window = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      {page > 1 && <Link href={href(page - 1)} className="btn-ghost h-9 px-2" aria-label="Previous page"><ChevronLeft className="size-4" /></Link>}
      {window.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - window[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined}
            className={p === page ? "btn-gold h-9 min-w-9 px-2" : "btn-ghost h-9 min-w-9 px-2 ring-1 ring-white/10"}>{p}</Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className="btn-ghost h-9 px-2" aria-label="Next page"><ChevronRight className="size-4" /></Link>}
    </nav>
  );
}
