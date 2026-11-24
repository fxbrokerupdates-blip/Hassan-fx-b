import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center bg-navy-950 px-4">
      <div className="card-navy max-w-lg p-10 text-center">
        <Compass className="mx-auto mb-4 size-14 text-gold-400" />
        <p className="font-display text-6xl font-extrabold gold-text">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-white/75">The page may have moved or no longer exists.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-gold h-10 px-5">Go home</Link>
          <Link href="/news" className="btn-outline h-10 px-5">All news</Link>
        </div>
      </div>
    </main>
  );
}
