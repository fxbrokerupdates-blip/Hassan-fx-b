# FX Broker Updates — temporary testing deployment

Current reference UI: `pages/` (static). The older Next.js app is retained, not used for this preview. This avoids changing the approved interface or exposing server secrets. Do not configure the root Next.js framework for this preview.

1. Verify Vercel Hobby eligibility and permitted non-commercial testing use; do not enable paid features.
2. Import `fxbrokerupdates-blip/Hassan-fx-b` in Vercel, select root directory `pages`, framework Other, no install/build command, output directory `.`. The local `vercel.json` applies only to this preview root.
3. Do not attach the existing domain; use the generated testing URL. No private environment secrets are needed for this static preview. Supabase Auth redirect allowlisting must be configured before real email/login tests.
4. Run `node scripts/check-static.mjs` from the repository root. Then verify mobile and desktop navigation, guest calculators, auth, role denial, browser console, and actual deployment responses. This static check is not a full Next.js build or browser test.
5. Keep noindex headers during testing. Production later migrates to Namecheap VPS under separate approval.
