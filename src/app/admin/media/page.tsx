import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/image-field";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Media Library" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requirePermission("dashboard.view");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("media_library").select("*").order("created_at", { ascending: false }).limit(120);
  return (
    <div className="space-y-6">
      <AdminHeader title="Media" gold="Library" description="Images are validated (PNG/JPG/WebP/GIF, max 5 MB) and stored in the public “media” bucket. Copy a URL into any image field." />
      <Card title="Upload"><ImageField id="media-upload" name="url" defaultValue="" /></Card>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {(data ?? []).map((m) => (
          <figure key={m.id} className="card-plain overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt={m.alt_text ?? ""} className="aspect-video w-full bg-navy-950 object-contain" loading="lazy" />
            <figcaption className="p-2 text-[11px] text-muted"><input readOnly value={m.url} className="input h-7 py-0 text-[11px]" aria-label="Image URL" />{Math.round(m.size_bytes / 1024)} KB · {formatDate(m.created_at)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
