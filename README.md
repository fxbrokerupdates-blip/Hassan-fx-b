# FX Broker Updates

Deployment target: GitHub Pages (Free, public static frontend) + Supabase (Free, database, authentication and server-side Edge Functions).

## Status
The supplied Next.js full-stack project is not yet compatible with GitHub Pages. This repository is initialized for the migration; no live application has been deployed.

## Migration gates
1. Preserve the existing navy/gold UI and assets while converting request-time pages to a static client application with client-side routing.
2. Replace Next.js server actions, middleware, auth callbacks and 23 API routes with Supabase Auth, protected RPCs and Edge Functions as appropriate.
3. Review and apply all seven database migrations to the dedicated Supabase project, verify RLS and staff permissions, and never publish secrets or private data.
4. Verify signup, password reset, member isolation, admin authorization, activity tracking, idle handling, rankings and live news integrations.
5. Build static files and configure GitHub Pages deployment. Check both repository subpath and future custom domain routing.

GitHub Pages is suitable only for uses permitted by its terms; do not use it as a commercial SaaS/business hosting service. Keep server-side secrets in Supabase, never in the public repository.
