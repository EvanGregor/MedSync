Phase 0

Work through these MedSync fixes in order. After each, tell me what changed and which files were touched.

1. Search the entire codebase and git history for any hardcoded API keys, service role keys, or secrets. Confirm .env.local is in .gitignore and was never committed. List every place environment variables are referenced to confirm nothing is duplicated or hardcoded as a fallback value in code.

2. Delete these routes/pages entirely, and confirm nothing else in the app imports or links to them: /api/test-users-table, /app/test-appointments, /app/doctor-dashboard/debug.

3. In the Supabase storage config (SQL or dashboard-managed), change the "reports" bucket from public to private. Then find every place in the codebase that references a public URL for files in that bucket, and replace it with a signed URL generated server-side with a short expiry.

4. Find and remove any marketing copy claiming HIPAA compliance, SOC2 compliance, or similar certifications anywhere in the app (landing page, footer, about page, etc.) unless we have actually verified and documented compliance.

Do not touch RLS policies, database schema, or the ML service in this pass — that's a separate phase.

Phase 1
MedSync currently has RLS disabled on: reports, ml_suggestions, notifications, users, doctor_patient_assignments. The anon role also has GRANT ALL on reports. This means any authenticated (or even anonymous) user can read/write any patient's data.

1. Enable RLS on all tables listed above.
2. Revoke the blanket GRANT ALL ... TO anon on reports.
3. Write RLS policies so that:
   - A patient can only SELECT their own rows in reports, ml_suggestions, notifications (matched via their user id, however that's currently linked to these tables — check the actual FK/column used, don't assume).
   - A doctor can only SELECT rows for patients they are assigned to via doctor_patient_assignments.
   - A lab user can INSERT into reports but only SELECT reports they uploaded.
   - No role can UPDATE or DELETE another user's rows.
4. Change how role is determined for these policies: currently role comes from auth.users.user_metadata, which is client-writable. Move role-checking to a source that can't be edited by the end user (a separate profiles/roles table locked down by its own RLS, or Supabase custom claims/auth hook) and update all RLS policies and app-side role checks to use that instead.
5. After writing each policy, show me the exact SQL so I can review it before it's applied, and explain in plain terms what access it grants/denies.

Test plan: for each table, describe how you'd verify a user from Role A cannot read Role B's data, so I can run that test manually.

Phase 2

The ML service in /ml-service is a FastAPI app currently hardcoded to be called via http://localhost:8000 (see app/api/ml-process/route.ts), which won't work once the Next.js app is deployed to Vercel.

1. Find every hardcoded localhost:8000 reference and replace it with an environment variable (e.g. ML_SERVICE_URL).
2. In serve_models.py, fix the CORS config — it currently allows all origins (allow_origins=["*"]). Restrict it to the actual app's production and local dev origins, read from an env var.
3. Fix the /analyze endpoint so that authentication failures return a proper 401/403 status code instead of a 200 with an error body in the JSON.
4. Do not change model logic or add deployment infra yet — just make the service correctly configurable and safe to point at a real host. Tell me what env vars now need to be set, and where (Vercel project settings, ML host's own config, etc.).

Phase 3

I've pulled the real production schema into supabase/migrations locally. Using that pulled migration file as ground truth (not the old scripts in /scripts):

1. List every table and note which ones overlap in purpose: users, doctors, patients, patient_profiles all appear to duplicate identity data.
2. Propose a consolidated schema: a single profiles table (or similar) as the source of truth for identity/role data, linked to auth.users via UUID FK. Show me the proposed table definition before writing any migration.
3. Identify every place in the app code that currently queries the tables being consolidated, so I know the blast radius before we touch anything.
4. Fix reports.patient_id, which is currently TEXT and stores a mix of short IDs and UUIDs, inconsistent with doctor_id which is UUID. Propose a migration to normalize it to UUID with a proper FK, and list what app code needs to change to match.
5. Note any tables the app code queries (messages, typing_status, chat_notifications) that have no corresponding schema in the pulled migration — these need to be created properly, not guessed at.

Output a migration plan with ordered steps, not a single giant migration — I want to review and apply this incrementally on the local Docker instance before ever touching production.

Phase 4

1. Design a minimal audit_log table that records: who accessed/modified which patient record, what action (view/create/update/delete), and when. Show me the schema before creating it.
2. Add logging calls at the points where reports and ml_suggestions are read or written, writing to that audit_log table.
3. Add a Content-Security-Policy header to the Next.js app (currently missing — check middleware.ts, which sets some security headers already).
4. Fix the Permissions-Policy header, currently camera=* — restrict it to camera=(self).
5. Confirm whether the current Supabase project tier has encryption at rest enabled by default, and tell me if any action is needed.

Phase 5

1. Re-enable ESLint and TypeScript error checking in next.config.mjs (currently ignoreDuringBuilds: true for both). Run the build and list every resulting error/warning, grouped by file — don't fix them yet, just give me the full list so I can see the scope.
2. Check for both pnpm-lock.yaml and package-lock.json in the repo root — confirm which one is actually in use (check packageManager in package.json and the CI config) and tell me which to delete.
3. Find all dependencies pinned to "latest" in package.json and propose pinned versions instead.
4. Find and list all dead code candidates: lib/medgemma.ts, lib/free-chat-api.ts, and any duplicate components (e.g. video-call.tsx vs medical-video-call.tsx) — confirm with an import-usage search whether each is truly unused before flagging it for removal.
5. Add basic SEO fixes: an OG image, JSON-LD structured data for a healthcare organization, and fix or remove the dead footer links pointing to non-existent pages (/doctors, /labs, /docs, etc.).

Testing phase

You are setting up and executing a complete, professional-grade test suite for MedSync — not a smoke test, not a sample of scenarios. Your goal is exhaustive coverage: every function, every API route, every RLS policy, every UI flow, and every input boundary condition gets a test.

Use this exact toolchain — don't substitute or add alternatives:
- Vitest — for both unit tests (Next.js/TypeScript) and integration tests (API routes against local Docker Supabase)
- pytest + httpx test client + pytest-mock — for the Python ML service (serve_models.py and related)
- pgTAP, run via `supabase test db` — for RLS policy testing specifically, written as SQL tests that run inside Postgres
- Playwright — for system/E2E tests, using multiple browser contexts for multi-user scenarios (chat, video calls) and testing across Chromium, WebKit, and mobile viewports

Set up each framework properly (config files, test script entries in package.json, CI-runnable) before writing tests for that layer — don't write ad-hoc test code without the framework wired in. If a framework isn't installed yet, install and configure it as the first step of that level.

Work through the levels in order. At the end of each level, give me a coverage report (files/functions/tables covered vs. not) before moving to the next — don't silently skip anything and call it done.

========================================
LEVEL 1 — UNIT TESTS (Vitest + pytest)
========================================
Test every pure function and isolated module in isolation, with mocked dependencies (mock Supabase client, mock fetch/axios calls, no real network or DB).

Vitest, for the Next.js side:
- lib/auth-utils.ts — every validation function, every role-check function, every edge case in email/password validation (empty, too long, unicode, whitespace-only, SQL-injection-style strings).
- lib/chat-api.ts and any chat message formatting/parsing logic — test with malformed messages, empty messages, extremely long messages, messages containing HTML/script tags.
- lib/types.ts — any type-guard or validation functions tied to types, tested against malformed objects, missing fields, wrong types.
- Any date/time formatting, ID generation (short_id logic), or data transformation utilities — test boundary values (leap years, timezone edges, empty strings, null, undefined).
- Every custom hook (use-auth-check.ts, use-webrtc.ts) via @testing-library/react-hooks or equivalent — test in isolation with mocked auth state: logged out, expired session, malformed session, role missing, role invalid.
- Every Zod schema used in forms — test with valid input, each field individually missing/invalid, boundary lengths, wrong types coerced.

pytest, for the ML service:
- Every pure function in serve_models.py and any preprocessing/postprocessing utility — test with valid image arrays, wrong shapes, wrong dtypes, corrupted/truncated file bytes, zero-byte input. Use pytest-mock to mock the actual model inference calls so these run fast and don't need the real model files loaded.

Target: as close to 100% line coverage on lib/ and ml-service utility functions as is realistically achievable. Report the actual coverage number (use Vitest's built-in coverage and pytest-cov).

========================================
LEVEL 2 — INTEGRATION TESTS (Vitest + pgTAP)
========================================
Test how modules interact with real local Docker Supabase — not fully isolated, not full end-to-end through the UI.

Vitest, against local Docker Supabase:
- Every API route under app/api/ — call each route directly (not through the browser) with:
  - a valid request as each relevant role
  - a valid request as the wrong role
  - a request with no auth token
  - a request with an expired/malformed token
  - a request missing required fields
  - a request with extra/unexpected fields
  - a request with wrong data types in fields
  - a request with a valid-shaped but nonexistent foreign key (e.g. a patient_id that doesn't exist)
- ML service integration — call the deployed (non-localhost) ML endpoint from the Next.js API route with real network calls in a test environment: valid image, invalid image, oversized image, service timeout (simulate slow/unresponsive service), service returning malformed response.
- Supabase Storage — integration test the actual upload/download flow against local Docker storage: valid file, oversized file, disallowed MIME type, MIME-type spoofed file (correct extension, wrong actual content), concurrent uploads to the same patient record.
- Chat/notifications — integration test that a message inserted by user A is only retrievable by intended recipient(s), tested via direct Supabase client queries as different authenticated sessions.
- Rate limiting (Upstash) — integration test that hitting an endpoint above its limit actually returns 429, and that limits reset correctly after the window.

pgTAP, run via `supabase test db`, for RLS specifically:
- Write SQL tests that enumerate every table × every role × every operation (SELECT/INSERT/UPDATE/DELETE) as a matrix. For each cell, assert the expected row count or expected permission error — e.g. "as patient A, SELECT on reports returns only patient A's rows", "as patient A, UPDATE on patient B's report affects 0 rows or errors". This must be exhaustive per table, not spot-checked.

========================================
LEVEL 3 — SYSTEM / END-TO-END TESTS (Playwright)
========================================
Full browser-driven tests against a fully running local stack (Next.js + local Docker Supabase + ML service), simulating a real user.

- Full signup → email verification → login → dashboard flow, for each of the three roles.
- Full "doctor reviews a patient's uploaded report and gets an ML suggestion" flow, involving all three roles interacting in sequence (lab uploads → ML processes → doctor views suggestion → patient sees it in their dashboard).
- Full appointment booking → video call join → call end flow, for both participants simultaneously — use two separate Playwright browser contexts to simulate both sides of the call at once.
- Full chat conversation between two roles using two browser contexts, including typing indicators and real-time message delivery (verify message appears for the recipient without a page refresh).
- Logout / session expiry mid-flow: start an action, expire the session, confirm the app handles it (redirect to login, not a silent failure or stale UI).
- Every primary navigation path: from a logged-in state, click through every visible nav item/link on every dashboard and confirm no 404s or broken routes (this should catch the dead footer links too).
- Password reset flow, start to finish, including an expired reset token and a reused reset token.
- Run every E2E scenario above at both desktop and mobile viewport sizes, and in both Chromium and WebKit projects (Playwright's built-in cross-browser config).

========================================
LEVEL 4 — EDGE CASE & ADVERSARIAL MATRIX (Vitest for API-level, Playwright for UI-level)
========================================
Do not skip this section. For every user-facing input field across the entire app (auth forms, profile forms, chat input, appointment booking, file upload, search/filter fields if any), systematically test:

- Empty input
- Only whitespace
- Maximum realistic length and one character beyond any stated/implied limit
- Unicode, emoji, right-to-left text
- HTML/script injection (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`)
- SQL-injection-style strings (`' OR '1'='1`, `'; DROP TABLE reports; --`)
- Null byte / control characters
- Numeric fields: negative numbers, zero, decimals where integers expected, extremely large numbers, non-numeric strings
- Date fields: invalid dates, past dates where future expected (e.g. booking an appointment in the past), far-future dates
- File uploads: zero-byte file, file with no extension, file with double extension (report.pdf.exe), extremely large file, corrupted file of a valid type
- Concurrent/race conditions: two lab uploads for the same patient at the same instant, two doctors updating the same report simultaneously, a user double-submitting a form by clicking twice quickly
- Direct API calls bypassing the frontend entirely for every mutation endpoint, with tampered/unexpected payloads (test this in Vitest, not Playwright — no need for a browser)

Build this as an actual test matrix (field x test case), not prose — enumerate every cell and mark pass/fail. Put UI-driven cases (typed into real form fields) in Playwright, and direct-API cases in Vitest.

========================================
REPORTING
========================================
At the end, give me:
1. A coverage report per level (files/routes/tables covered, with any gaps explicitly called out — not silently omitted)
2. A single consolidated pass/fail table across all four levels
3. A prioritized list of every failure found, ranked by severity, with the file/route responsible
4. The actual test files created, organized by level and by tool (vitest/unit, vitest/integration, pytest, pgtap, playwright), so they can be run again in CI going forward
5. The exact npm/CLI scripts to run each suite independently (e.g. `npm run test:unit`, `npm run test:e2e`, `supabase test db`)

If something in this list turns out to be genuinely inapplicable to MedSync's architecture (e.g. no search fields exist), say so explicitly rather than silently skipping it.