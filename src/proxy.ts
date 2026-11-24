import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/dashboard", "/admin"];

// Redirect management (admin → Settings → Redirects). Best-effort 60s cache per instance.
let redirectCache: { at: number; map: Map<string, { to: string; code: number }> } | null = null;
async function findRedirect(path: string, url: string, key: string) {
  if (!redirectCache || Date.now() - redirectCache.at > 60_000) {
    try {
      const res = await fetch(`${url}/rest/v1/redirects?select=from_path,to_path,status_code`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
      });
      const rows = res.ok ? ((await res.json()) as { from_path: string; to_path: string; status_code: number }[]) : [];
      redirectCache = { at: Date.now(), map: new Map(rows.map((r) => [r.from_path, { to: r.to_path, code: r.status_code }])) };
    } catch {
      redirectCache = { at: Date.now(), map: new Map() };
    }
  }
  return redirectCache.map.get(path);
}

/**
 * Refreshes the Supabase session cookie on every navigation and blocks
 * unauthenticated access to member/admin areas. Role checks are enforced again
 * server-side in each layout and by database RLS.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (!url || !key) {
    if (isProtected) return NextResponse.redirect(new URL("/setup-required", request.url));
    return NextResponse.next();
  }

  if (!isProtected && !path.startsWith("/api")) {
    const r = await findRedirect(path, url, key);
    if (r) return NextResponse.redirect(new URL(r.to, request.url), r.code);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        const sessionOnly = request.cookies.get("fxbu_session_only")?.value === "1";
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, sessionOnly && value ? { ...options, maxAge: undefined, expires: undefined } : options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (isProtected && !userId) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }
  if (userId && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|images/|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|api/track|api/heartbeat|api/cron).*)"],
};
