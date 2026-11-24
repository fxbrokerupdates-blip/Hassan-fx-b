import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/types/db";

export interface Viewer {
  id: string;
  email: string;
  profile: Profile | null;
  roles: string[];
  permissions: string[];
  isStaff: boolean;
}

/** Current signed-in user with profile, roles and permissions (verified JWT). Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSupabaseServer();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;
  const [{ data: profile }, { data: roles }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle(),
    supabase.from("user_roles").select("role_key, roles(is_staff)").eq("user_id", claims.sub),
    supabase.rpc("my_permissions"),
  ]);
  const roleRows = (roles ?? []) as unknown as { role_key: string; roles: { is_staff: boolean } | null }[];
  return {
    id: claims.sub,
    email: (claims.email as string) ?? profile?.email ?? "",
    profile: (profile as Profile) ?? null,
    roles: roleRows.map((r) => r.role_key),
    permissions: (perms as string[]) ?? [],
    isStaff: roleRows.some((r) => r.roles?.is_staff) && profile?.status === "active",
  };
});

export async function requireUser(next = "/dashboard"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (viewer.profile?.status === "suspended") redirect("/account-suspended");
  return viewer;
}

export function can(viewer: Viewer | null, permission: string): boolean {
  return Boolean(viewer && (viewer.roles.includes("super_admin") || viewer.permissions.includes(permission)));
}

/** Server-side guard for admin pages/actions. Unknown to non-staff (404), never revealing admin routes. */
export async function requirePermission(permission: string): Promise<Viewer> {
  const viewer = await requireUser("/admin");
  if (!viewer.isStaff || !can(viewer, permission)) notFound();
  return viewer;
}

/** For server actions: throws instead of redirecting. */
export async function assertPermission(permission: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !viewer.isStaff || !can(viewer, permission)) throw new Error("Not authorized");
  return viewer;
}
