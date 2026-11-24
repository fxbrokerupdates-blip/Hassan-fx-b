#!/usr/bin/env node
// Grants Super Admin to an existing registered user — only works while no Super Admin exists.
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:promote -- you@example.com
import { createClient } from "@supabase/supabase-js";
const email = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) { console.error("Usage: npm run admin:promote -- <email>  (requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db.rpc("bootstrap_super_admin", { p_email: email });
if (error) { console.error("Failed:", error.message); process.exit(1); }
console.log(data);
