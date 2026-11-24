import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ src = "/images/logo.png", name = "FX Broker Updates", className, priority }: {
  src?: string; name?: string; className?: string; priority?: boolean;
}) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)} aria-label={`${name} — home`}>
      <Image src={src || "/images/logo.png"} alt={name} width={464} height={116} priority={priority}
        className="h-auto w-[190px] sm:w-[222px]" />
    </Link>
  );
}
