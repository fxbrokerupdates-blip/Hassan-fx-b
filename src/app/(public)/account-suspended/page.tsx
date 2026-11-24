import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Account suspended", robots: { index: false } };

export default function Suspended() {
  return (
    <section className="container-site grid min-h-[50vh] place-items-center py-16">
      <div className="card-navy max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-red-400" />
        <h1 className="font-display text-2xl font-bold">Account suspended</h1>
        <p className="mt-3 text-white/80">Your account is currently suspended. If you believe this is a mistake, please contact support.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/contact" className="btn-gold h-10 px-5">Contact support</Link>
          <form action="/auth/signout" method="post"><button className="btn-outline h-10 px-5">Log out</button></form>
        </div>
      </div>
    </section>
  );
}
