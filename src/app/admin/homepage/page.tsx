import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminHeader, Card } from "@/components/admin/ui";
import { JsonForm } from "@/components/admin/json-form";
import { saveHomepageSectionAction } from "@/app/admin/actions";
import { DEFAULT_HOMEPAGE } from "@/lib/defaults";

export const metadata = { title: "Homepage Builder" };

export default async function HomepageBuilder() {
  await requirePermission("homepage.manage");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("homepage_sections").select("*").order("sort_order");
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Homepage" gold="Builder" description="Edit every homepage section without code. The layout follows the approved reference design; toggles hide sections without deleting content."
        actions={<><Link href="/" target="_blank" className="btn-outline h-10 px-4 text-sm">Preview homepage ↗</Link><Link href="/admin/r/categories" className="btn-outline h-10 px-4 text-sm">Category cards</Link>
          <Link href="/admin/r/navigation" className="btn-outline h-10 px-4 text-sm">Header menu</Link><Link href="/admin/r/footer" className="btn-outline h-10 px-4 text-sm">Footer columns</Link>
          <Link href="/admin/r/social" className="btn-outline h-10 px-4 text-sm">Social links</Link></>} />
      <div className="space-y-6">
        {(data ?? []).map((s) => {
          const def = (DEFAULT_HOMEPAGE as Record<string, unknown>)[s.key] ?? {};
          const content = Object.keys(s.content ?? {}).length ? s.content : def;
          return (
            <Card key={s.key} title={`${s.sort_order / 10}. ${s.title}`}>
              {s.key === "categories" ? <p className="mb-3 text-sm text-muted">Cards come from categories marked “Show as homepage card”. <Link href="/admin/r/categories" className="text-gold-400 underline">Manage categories</Link></p> : null}
              {s.key === "advertisement" ? <p className="mb-3 text-sm text-muted">Shows an active ad with placement “home_banner”. <Link href="/admin/r/ads" className="text-gold-400 underline">Manage ads</Link></p> : null}
              {s.key === "social_cards" ? <p className="mb-3 text-xs text-muted">Dott Plus is an external promotional link only.</p> : null}
              <JsonForm initial={content} field="content" visibility={s.is_visible} action={saveHomepageSectionAction.bind(null, s.key)} submit="Save section" />
            </Card>
          );
        })}
        {(data ?? []).length === 0 && <p className="text-muted">No sections found — run the database migrations.</p>}
      </div>
    </div>
  );
}
