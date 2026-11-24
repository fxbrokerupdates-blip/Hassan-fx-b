"use client";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** Runs a server action with an optional confirmation prompt. */
export function ActionButton({ action, confirmText, children, className, title }: {
  action: () => Promise<unknown>; confirmText?: string; children: React.ReactNode; className?: string; title?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button type="button" title={title} aria-label={title} disabled={pending}
      onClick={() => { if (confirmText && !confirm(confirmText)) return; start(async () => { await action(); }); }}
      className={cn(className, pending && "opacity-60")}>
      {children}
    </button>
  );
}
