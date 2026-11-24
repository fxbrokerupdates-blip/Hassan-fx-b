"use client";
import Link from "next/link";
import { track } from "@/lib/analytics/client";
import type { EventName } from "@/lib/analytics/events";

/** Link that records a whitelisted click event. External links open safely in a new tab. */
export function TrackedLink({ href, event, meta, external, children, ...rest }: {
  href: string; event: EventName; meta?: Record<string, string | number | boolean | null>; external?: boolean;
  children: React.ReactNode; className?: string; "aria-label"?: string; content_id?: string; content_type?: string;
}) {
  const { content_id, content_type, ...anchorProps } = rest;
  const onClick = () => track(event, { content_id, content_type, metadata: { ...meta, href: href.slice(0, 200) } });
  if (external || /^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer nofollow" onClick={onClick} {...anchorProps}>{children}</a>;
  }
  return <Link href={href} onClick={onClick} {...anchorProps}>{children}</Link>;
}
