import Image from "next/image";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="relative grid min-h-screen bg-navy-950 lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/images/hero-markets.webp" alt="" fill priority sizes="50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-linear-to-r from-navy-950/30 via-navy-950/40 to-navy-950" />
        <div className="absolute bottom-10 left-10 max-w-md">
          <p className="font-display text-3xl font-extrabold">Your Trusted Source for <span className="gold-text">Global Broker News</span></p>
          <p className="mt-2 text-white/80">Daily broker updates, market news, free banner prompts, video scripts and an AI Creator Studio.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-10">
        <Logo className="mb-8" priority />
        <div className="w-full max-w-[520px]">{children}</div>
      </div>
    </main>
  );
}
