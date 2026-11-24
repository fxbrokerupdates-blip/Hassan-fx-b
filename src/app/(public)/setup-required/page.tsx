import { Database } from "lucide-react";

export const metadata = { title: "Setup required", robots: { index: false } };

export default function SetupRequired() {
  return (
    <section className="container-site grid min-h-[50vh] place-items-center py-16">
      <div className="card-navy max-w-xl p-8 text-center">
        <Database className="mx-auto mb-4 size-12 text-gold-400" />
        <h1 className="font-display text-2xl font-bold">Database not connected</h1>
        <p className="mt-3 text-white/80">Accounts, dashboards and the admin panel need Supabase. Add <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>, then run the migrations. See SETUP.md.</p>
      </div>
    </section>
  );
}
