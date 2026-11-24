# Admin Guide

Open **/admin** (staff only). The sidebar only shows modules your role can use.

## Roles
| Role | Typical access |
|---|---|
| Super Admin | Everything, including granting Administrator/Super Admin |
| Administrator | Everything except role management |
| Editor | News (edit/publish), brokers, prompts, scripts, AI studio, content reports |
| News Manager | News incl. delete, sources, jobs, automation, health |
| Content Creator | Draft news, prompts, scripts, AI studio (cannot publish news) |
| Marketing Manager | Homepage, ads, newsletter, notifications, analytics (aggregate) & exports |
| Support Manager | Users (incl. email/phone), inbox, reports, individual activity |
| Analytics Viewer | Analytics, live visitors, rankings, individual activity — no emails/phones |

See **Staff & Roles** for the full permission matrix. Assign roles from **Users → user → Staff roles**.

## Daily workflow
1. **Overview** — new users, online now, DAU/WAU/MAU, content waiting for review, system status.
2. **Broker News / Trading News** — filter *Status = Pending review* to approve collected items. Open an item, check the source, edit the summary, set priority (HOT only for significant verified updates), set *Published*, optionally tick *Send in-app notification*, **Save**. Bulk actions: publish/draft/archive/reject/delete.
3. **Banner Prompts / Video Scripts** — create manually or let **Daily Automation** draft them; review, set *Published*, optionally notify members.
4. **Inbox / Ad Enquiries / Content Reports / Account Requests** — set status, assign, add internal notes.

## News CMS tips
* Statuses: draft → pending_review → scheduled/published → archived/rejected. Scheduling needs a UTC time; the *publish_scheduled* job publishes it.
* Tags: comma-separated. Key highlights: separated by `|`.
* Every change stores an editorial revision (sidebar). Never paste full copyrighted articles — write original summaries and link the source.
* **Generate summary / posts** opens the admin AI studio with the article as source.

## Brokers
Only publish information you can verify. Regulations require a verification URL (regulator register). Promotions can be marked unverified (shown "as announced by the broker"). Reviews are typed *editorial / user / sponsored*; sponsored content is always labelled.

## Analytics
* **Live Visitors** — one row per person (tabs counted once), active/idle state, current page, session and engaged time (estimates), device, country, source. Realtime updates.
* **Website Analytics** — date ranges, traffic chart, sources, devices, browsers, heatmap, feature popularity, top/landing/exit pages, countries; **Funnels**; **Retention** (D1/D7/D30 + weekly/monthly cohorts).
* **User Rankings** — 15 leaderboards (most active today/week/month/all time via the range picker, consistency, engaged time, articles, prompts, scripts, AI, saved, sessions, content creators, IBs, broker employees) with filters and movement. **Recalculate now** refreshes aggregates. Change weights in **Settings → Analytics & Privacy**.
* **User profile** — account overview, engagement summary, feature usage, 90-day chart, activity calendar, chronological timeline, notes, actions (suspend/reactivate, verify, resend verification, password reset, AI limit, feature access, roles, delete). Viewing a profile is audit-logged.
* **Segments** — JSON rules (see field help). Preview counts, view members, export, notify.
* **Reports & Export** — CSV for users, activity, rankings, content, AI usage, traffic, registrations, retention, brokers. Exports are logged; PII only with the *users.pii* permission.

## Automation & AI
* **News Sources** — add feeds only when automated collection is permitted (tick the confirmation). *Trusted + Auto-publish* publishes non-risky items directly; everything else goes to review. **Refresh this source now** tests it.
* **Jobs & Refresh** — enable/disable jobs, change intervals, run now, see failures.
* **AI Settings** — enable AI, choose provider/model, fallback, limits, cost per million tokens, extra instructions. Keys live in environment variables (shown masked).
* **Daily Automation** — time (UTC), counts, languages, durations, approval/auto-publish.

## Website management
* **Homepage Builder** — every section (hero, social & Dott Plus cards, daily tools, news bar, today's panels) with visibility toggles; category cards from *Categories*; header menu, footer columns and social links in their own lists.
* **Global Settings** — brand, theme colours, registration & email verification, maintenance mode, footer & legal pages, SEO, tracking & retention, engagement weights, news pipeline, providers, uploads.
* **Feature Flags** — switch modules off without deleting data. **Redirects** — 301/302 rules.
* **Audit Logs** — append-only record of admin actions. **System Health** — real checks: database, service role, storage, collector, jobs, AI, email, push.
