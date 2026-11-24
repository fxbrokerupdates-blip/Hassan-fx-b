import type { Priority } from "@/types/db";

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "hot") return <span className="badge-hot">Hot</span>;
  if (priority === "warm") return <span className="badge-warm">Warm</span>;
  return null;
}
export function SampleBadge({ show }: { show: boolean }) {
  return show ? <span className="badge-sample" title="Development placeholder — not real news">Sample</span> : null;
}
export function OriginBadge({ origin }: { origin: string }) {
  const map: Record<string, string> = { original: "Original editorial", ai_assisted: "AI-assisted summary", source_excerpt: "Source excerpt" };
  return <span className="badge-normal normal-case">{map[origin] ?? origin}</span>;
}
