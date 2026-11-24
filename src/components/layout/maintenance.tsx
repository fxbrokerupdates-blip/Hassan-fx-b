import { Wrench } from "lucide-react";

export function MaintenanceNotice({ message }: { message: string }) {
  return (
    <section className="container-site grid min-h-[50vh] place-items-center py-20 text-center">
      <div className="card-navy max-w-xl p-10">
        <Wrench className="mx-auto mb-4 size-12 text-gold-400" />
        <h1 className="font-display text-2xl font-bold">Scheduled maintenance</h1>
        <p className="mt-3 text-white/80">{message}</p>
      </div>
    </section>
  );
}
