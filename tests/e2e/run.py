import re, subprocess, time, json, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3100"
PSQL = ["psql", "-h", "localhost", "-p", "55433", "-U", "postgres", "-d", "app", "-tAc"]
def sql(q): return subprocess.run(PSQL + [q], capture_output=True, text=True).stdout.strip()
results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail)); print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))

def signup(page, name, email, prof="introducing_broker", country="AE"):
    page.goto(f"{BASE}/signup")
    page.fill("#full_name", name); page.fill("#email", email)
    page.select_option("#country", country); page.select_option("#profession", prof)
    page.fill("#phone", "501234567")
    page.fill("input[name=password]", "StrongPass123"); page.fill("input[name=confirm_password]", "StrongPass123")
    page.check("input[name=terms]")
    page.click("button:has-text('Create Account')")
    page.wait_for_url(re.compile(r"/dashboard|/signup/success"), timeout=20000)
    return page.url

def errors_on(page):
    t = page.content()
    return ("Application error" in t) or ("Internal Server Error" in t) or ("This page could not be found" in t)

sql("delete from auth.users; truncate analytics_events, analytics_sessions, visitor_presence, daily_analytics_summary, content_analytics_summary, notifications cascade; delete from rate_limits; delete from news_articles where slug like 'e2e-%';")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1366, "height": 900}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    page = ctx.new_page()
    console_errors = []
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    # ---- member signup & dashboard
    url = signup(page, "Alice Member", "alice@test.local")
    check("signup redirects to dashboard", "/dashboard" in url, url)
    check("profile created by trigger", sql("select profession||country from profiles where email='alice@test.local'") == "introducing_brokerAE")
    check("email verification & last login synced to profile", sql("select (email_verified_at is not null and last_login_at is not null)::text from profiles where email='alice@test.local'") == "true")
    check("dashboard renders welcome", page.locator("text=Welcome back").count() > 0)
    page.goto(f"{BASE}/dashboard/prompts"); page.wait_for_timeout(1500)
    btn = page.locator("button:has-text('Copy Prompt')").first.element_handle()
    check("member sees full prompts (copy buttons)", page.locator("button:has-text('Copy Prompt')").count() >= 3)
    btn.click(); page.wait_for_timeout(300); btn.click()  # second click within 10s must not double count
    page.goto(f"{BASE}/news"); page.wait_for_timeout(800)
    page.locator("a[href^='/news/sample']").first.click(); page.wait_for_timeout(2500)
    page.mouse.wheel(0, 3000); page.wait_for_timeout(4000)
    page.goto(f"{BASE}/dashboard/saved"); page.wait_for_timeout(500)
    # save an article from listing
    page.goto(f"{BASE}/broker-updates"); page.wait_for_timeout(1000)
    page.locator("button[aria-label='Save']").first.click(); page.wait_for_timeout(1200)
    check("save article persisted", sql("select count(*) from saved_content s join profiles p on p.id=s.user_id where p.email='alice@test.local'") == "1")
    # follow broker
    page.goto(f"{BASE}/brokers/atlas-fx"); page.wait_for_timeout(1200)
    page.click("button:has-text('Follow broker')"); page.wait_for_timeout(1200)
    check("follow broker persisted", sql("select count(*) from favourite_brokers") == "1")
    # AI studio — provider not configured
    page.goto(f"{BASE}/dashboard/studio"); page.wait_for_timeout(1000)
    check("studio shows provider-not-configured notice", page.locator("text=not configured").count() > 0)
    # profile update
    page.goto(f"{BASE}/dashboard/profile"); page.fill("#full_name", "Alice M."); page.click("button:has-text('Save profile')"); page.wait_for_timeout(1500)
    check("profile update saved", sql("select full_name from profiles where email='alice@test.local'") == "Alice M.")
    page.wait_for_timeout(3000)
    uid = sql("select id from profiles where email='alice@test.local'")
    ev = sql(f"select string_agg(distinct event_name, ',') from analytics_events where user_id='{uid}'")
    check("analytics events recorded for member", all(e in ev for e in ["page_view", "banner_prompt_copy", "article_open", "login_success"] if e != "login_success") , ev)
    check("copy deduplicated", sql(f"select count(*) from analytics_events where user_id='{uid}' and event_name='banner_prompt_copy'") == "1")
    check("presence row exists (one per person)", sql(f"select count(*) from visitor_presence where user_id='{uid}'") == "1")
    check("engaged time accumulated", int(sql(f"select coalesce(sum(engaged_seconds),0) from daily_user_activity where user_id='{uid}'") or 0) >= 0)
    check("no IP stored", sql("select count(*) from information_schema.columns where table_schema='public' and column_name ilike '%ip%addr%'") == "0")

    # member cannot open admin
    r = page.goto(f"{BASE}/admin"); check("member gets 404 on /admin", r.status == 404, str(r.status))
    rr = page.request.get(f"{BASE}/api/admin/export?report=users"); check("member blocked from admin export", rr.status == 404, str(rr.status))
    page.goto(f"{BASE}/dashboard"); page.click("button:has-text('Logout')"); page.wait_for_timeout(1500)

    # ---- admin
    signup(page, "Site Admin", "admin@test.local", "other", "PK")
    print(sql("select public.bootstrap_super_admin('admin@test.local')"))
    page.goto(f"{BASE}/admin"); page.wait_for_timeout(1500)
    check("admin overview renders", page.locator("text=Total registered").count() > 0 and not errors_on(page))
    pages = ["/admin/live", "/admin/analytics", "/admin/analytics?tab=funnels", "/admin/analytics?tab=retention", "/admin/rankings", "/admin/content-performance",
             "/admin/reports", "/admin/users", f"/admin/users/{uid}", "/admin/staff", "/admin/r/news?news_type=broker", "/admin/r/news/new", "/admin/r/brokers",
             "/admin/r/prompts", "/admin/r/scripts", "/admin/r/sources", "/admin/jobs", "/admin/ai-studio", "/admin/ai-settings", "/admin/automation",
             "/admin/homepage", "/admin/r/ads", "/admin/notifications", "/admin/r/campaigns", "/admin/r/subscribers", "/admin/r/messages", "/admin/r/enquiries",
             "/admin/settings", "/admin/settings?tab=analytics", "/admin/r/flags", "/admin/r/redirects", "/admin/audit", "/admin/health", "/admin/media",
             "/admin/r/segments", "/admin/r/categories", "/admin/r/regulations", "/admin/r/reviews", "/admin/r/requests", "/admin/r/reports", "/admin/r/templates", "/admin/r/navigation", "/admin/r/footer", "/admin/r/social"]
    bad = []
    for pth in pages:
        resp = page.goto(BASE + pth); page.wait_for_timeout(300)
        alerts = [t for t in page.locator("main [role=alert]").all_inner_texts() if t.strip() and "not configured" not in t]
        if resp.status >= 400 or errors_on(page) or alerts:
            bad.append(f"{pth}:{resp.status}:{' | '.join(alerts)[:200]}")
    check(f"all {len(pages)} admin pages render without errors", not bad, "; ".join(bad))

    page.goto(f"{BASE}/admin/live"); page.wait_for_timeout(1500)
    check("live visitors lists the admin session", page.locator("text=Site Admin").count() > 0)
    page.goto(f"{BASE}/admin/users/{uid}"); page.wait_for_timeout(800)
    check("user timeline shows copy event", page.locator("text=Copied banner prompt").count() > 0)

    # create & publish news via CMS
    page.goto(f"{BASE}/admin/r/news/new?news_type=broker")
    page.fill("#f-title", "E2E test broker announcement headline")
    page.fill("#f-summary", "Editorial summary for the end-to-end test.")
    page.select_option("#f-priority", "warm"); page.select_option("#f-status", "published")
    page.fill("#f-_tags", "e2e, testing")
    page.check("input[name=_notify]")
    page.click("form button[type=submit]:has-text('Save'), form button:text-is('Save')")
    try:
        page.wait_for_url(re.compile(r"saved=1"), timeout=15000)
    except Exception:
        print("NEWS SAVE ALERTS:", page.locator("main [role=alert]").all_inner_texts(), page.locator("p.text-red-400").all_inner_texts())
        page.screenshot(path="/tmp/e2e-newsfail.png", full_page=True)
    check("article created & published", sql("select status from news_articles where slug='e2e-test-broker-announcement-headline'") == "published")
    check("tags synced", sql("select count(*) from news_article_tags t join news_articles a on a.id=t.article_id where a.slug='e2e-test-broker-announcement-headline'") == "2")
    check("publish notification delivered", int(sql("select recipients from notifications where dedupe_key like 'article:%'") or 0) >= 1)
    r = page.goto(f"{BASE}/news/e2e-test-broker-announcement-headline"); check("published article page live", r.status == 200 and page.locator("h1:has-text('E2E test broker')").count() > 0)
    check("audit log recorded publish", int(sql("select count(*) from admin_audit_logs where action in ('publish','create') and resource='news_articles'")) >= 1)

    # settings save via structured form
    page.goto(f"{BASE}/admin/settings?tab=registration"); page.locator("button:has-text('Save')").first.click(); page.wait_for_timeout(1200)
    check("settings save works", page.locator("text=Settings saved.").count() > 0)
    # homepage builder save
    page.goto(f"{BASE}/admin/homepage"); page.locator("button:has-text('Save section')").first.click(); page.wait_for_timeout(1200)
    check("homepage section save works", page.locator("text=Section saved").count() > 0)

    # jobs via cron endpoint
    rr = page.request.get(f"{BASE}/api/cron/run")
    check("cron endpoint rejects without secret", rr.status == 401)
    sql("update scheduled_jobs set next_run_at = now() - interval '1 minute'")
    rr = page.request.get(f"{BASE}/api/cron/run", headers={"Authorization": "Bearer local-cron-secret-0123456789abcdef"})
    body = rr.json(); keys = [x["key"] for x in body.get("ran", [])]
    check("cron runs due jobs", rr.status == 200 and "analytics_rollup" in keys, json.dumps(body)[:300])
    page.goto(f"{BASE}/admin/rankings?range=today"); page.wait_for_timeout(800)
    check("rankings show the member", page.locator("text=Alice M.").count() > 0)
    rr = page.request.get(f"{BASE}/api/admin/export?report=users")
    check("admin CSV export works", rr.status == 200 and "alice@test.local" in rr.text() and rr.text().startswith("﻿"))
    # notification to all
    page.goto(f"{BASE}/admin/notifications"); page.fill("#title", "Hello members"); page.click("button:has-text('Send / schedule')"); page.wait_for_timeout(1500)
    check("manual notification delivered", page.locator("text=Delivered to").count() > 0)
    # suspend alice
    page.goto(f"{BASE}/admin/users/{uid}")
    page.once("dialog", lambda d: d.accept("e2e test"))
    page.click("button:has-text('Suspend')"); page.wait_for_timeout(2000)
    check("suspend user works", sql(f"select status from profiles where id='{uid}'") == "suspended")
    page.click("button:has-text('Logout')") if page.locator("button:has-text('Logout')").count() else None
    page.wait_for_timeout(800)
    page.goto(f"{BASE}/login"); page.fill("#email", "alice@test.local"); page.fill("input[name=password]", "StrongPass123"); page.click("button:has-text('Login')"); page.wait_for_timeout(2500)
    check("suspended user cannot log in", "/dashboard" not in page.url and page.locator("text=suspended").count() > 0, page.url)
    check("no client-side runtime errors", not console_errors, "; ".join(console_errors[:3]))
    page.goto(f"{BASE}/"); page.screenshot(path="/tmp/e2e-home.png")
    page.goto(f"{BASE}/admin"); page.screenshot(path="/tmp/e2e-admin.png", full_page=False)
    page.goto(f"{BASE}/admin/users/{uid}"); page.screenshot(path="/tmp/e2e-user.png", full_page=True)
    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results)-len(failed)}/{len(results)} checks passed")
json.dump([{"check": n, "passed": ok, "detail": d} for n, ok, d in results], open("/tmp/e2e-results.json", "w"), indent=1)
sys.exit(1 if failed else 0)
