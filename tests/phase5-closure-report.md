# Phase 5 testing closure report

Run date: 2026-09-26. Target: local Supabase and Chromium.

## Behavioral RLS results

`supabase test db` ran the 81 assertions in `supabase/tests/rls_policies.test.sql`: **62 passed, 19 failed**. Fixtures are two patients (A and B), one doctor assigned only to A, and one lab user. Tests execute as Postgres `authenticated` with each fixture's JWT subject; fixtures roll back at the end.

| Table | Operation | Patient A | Patient B | Assigned doctor | Lab |
|---|---|---|---|---|---|
| reports | SELECT | **FAIL** 2 rows, expected 1 | **FAIL** 2, expected 1 | **FAIL** 2, expected 1 | **FAIL** 2, expected 1 |
| reports | INSERT | **FAIL** unauthorized insert allowed | **FAIL** unauthorized insert allowed | **FAIL** unauthorized insert allowed | PASS insert allowed and persisted |
| reports | UPDATE | **FAIL** 1 row changed, expected 0 | **FAIL** 1, expected 0 | **FAIL** 1, expected 0 | **FAIL** 1, expected 0 |
| reports | DELETE | **FAIL** 1 row deleted, expected 0 | PASS 0 | PASS 0 | PASS 0 |
| ml_suggestions | SELECT | PASS | PASS | **FAIL** 0 rows, expected assigned suggestion | PASS |
| ml_suggestions | INSERT | PASS denied | PASS denied | PASS denied | PASS denied |
| ml_suggestions | UPDATE | PASS 0 rows | PASS 0 | PASS 0 | PASS 0 |
| ml_suggestions | DELETE | PASS 0 rows | PASS 0 | PASS 0 | PASS 0 |
| notifications | SELECT | PASS | PASS | PASS | PASS |
| notifications | INSERT | **FAIL** unauthorized insert allowed | **FAIL** unauthorized insert allowed | **FAIL** unauthorized insert allowed | **FAIL** unauthorized insert allowed |
| notifications | UPDATE | **FAIL** 1 row changed, expected 0 | PASS 0 | PASS 0 | PASS 0 |
| notifications | DELETE | PASS 0 rows | PASS 0 | PASS 0 | PASS 0 |
| profiles | SELECT | PASS | PASS | PASS | PASS |
| profiles | INSERT | PASS denied | PASS denied | PASS denied | PASS denied |
| profiles | UPDATE own row | PASS 1 row | **FAIL** 0 rows, expected 1 | PASS 1 row | PASS 1 row |
| profiles | DELETE | PASS 0 rows | PASS 0 | PASS 0 | PASS 0 |
| doctor_patient_assignments | SELECT | PASS | PASS | PASS | PASS |
| doctor_patient_assignments | INSERT | PASS denied | PASS denied | PASS denied | PASS denied |
| doctor_patient_assignments | UPDATE | PASS 0 rows | PASS 0 | PASS 0 | PASS 0 |
| doctor_patient_assignments | DELETE | PASS 0 rows | PASS 0 | PASS 0 | PASS 0 |

The 19 failures are the exact pgTAP failure IDs **1, 6, 11–12, 16, 21, 23, 26, 28, 31, 33, 39, 42, 44, 47, 50, 52, 57, 62**. The test output also reports legacy auth-trigger notices about dropped `public.users` and `public.user_short_ids`; these do not prevent the RLS test transaction from running. The failure set shows that the current policies/grants permit report and notification writes beyond the intended role, leak report rows, allow report updates/deletes, fail to expose an assigned doctor's suggestion, and block patient B's own profile update.

## Executed suites and coverage

| Level / suite | Observed result | Coverage / limitation |
|---|---|---|
| Vitest unit | **114/114 pass**, 13 files | 54.51% lines, 52.88% statements, 46.75% branches, 49.12% functions. `lib/` 82.50% lines; `lib/gemini.ts` 73.68% lines and 100% functions. Gemini tests cover success, API error, timeout, empty, whitespace, and malformed prompt inputs. |
| pgTAP RLS | **62/81 pass, 19 fail** | Five tables × four authenticated identities × four operations are behaviorally exercised, plus the lab report insert persistence check. Detailed results above. |
| Playwright navigation/auth | Chromium only | Four basic navigation/auth UI checks passed in the combined run. Auth input values were entered; malformed email native validity and the 254-character limit were checked. The latest auth matrix run **failed** at reset confirmation mismatch because “Passwords do not match” never rendered. Signup role value is selectable, but account creation does not complete; the form returns to its initial state and Next dev server logs `Unexpected end of JSON input` for `/signup`. No patient/doctor/lab dashboard path is confirmed by the current rerun. |
| Playwright report workflow | Chromium only | Fails before upload completion: UI reports `Storage access failed: The connection to the database timed out`; doctor review and patient visibility are consequently not reached. |
| Playwright chat workflow | Chromium only | Fails at doctor login; separate context remains at `/login` with `AUTHENTICATING...`. |
| Playwright video workflow | Chromium only | Fails before call flow when login form never hydrates (`data-hydrated=false`). |
| Playwright file adversarial flow | Chromium only | Latest rerun stopped at lab login (redirected back to `/login`), before selecting a file. A prior run stopped at “Initializing Uplink…”. The valid report workflow independently reached upload UI but Storage timed out. No adversarial file was recorded as accepted or rejected by the app. |
| Python ML | **23/23 pass** | `ml-service/serve_models.py`: **62% line coverage** (204 statements, 78 missed). Warnings: Starlette's `TestClient` reports an `httpx` deprecation; pytest could not write its cache under this workspace. |
| TypeScript | Pass | Final `tsc --noEmit` completed with no errors after the email limit and native role-select changes. |
| Production build | **Fail** | Optimized compilation completed with an Edge Runtime warning from `@upstash/redis` and an outdated Browserslist notice. Next's lint step failed: hook-rule violations in `app/doctor-dashboard/communication/page.tsx` (calls to `useSuggestionInChat` inside callbacks at 932 and 1007), plus JSX unescaped quote/apostrophe errors in `app/doctor-dashboard/ai-assistant/page.tsx`, `app/doctor-dashboard/consultations/page.tsx`, `app/doctor-dashboard/page.tsx`, `app/login/page.tsx`, `app/not-found.tsx`, `app/page.tsx`, `app/patient-dashboard/reports/page.tsx`, `app/reset-password/page.tsx`, `app/signup/page.tsx`, `app/verify-email/page.tsx`, `components/landing/AnimatedHero.tsx`, `components/medical/radical/BlueprintElements.tsx`, `components/medical/radical/DeconstructedCard.tsx`, and `components/medical/radical/MassiveNumber.tsx`. Hook dependency and raw-img warnings also appeared in dashboard and media components. |

The email forms now cap input at 254 characters and `validateEmail` rejects values over 254. The actual metadata export includes `metadataBase: https://medsync.health`; the latest browser server output showed no metadataBase warning.

## Artifacts and rerun commands

- Unit: `tests/unit/`, including `tests/unit/gemini.test.ts`; run `pnpm test:unit:coverage`.
- RLS: `supabase/tests/rls_policies.test.sql`; run `pnpm test:pgtap` (or `supabase test db`).
- Browser: `tests/e2e/navigation.spec.ts`, `tests/e2e/file-upload.spec.ts`, `tests/e2e/workflows.spec.ts`; run `pnpm test:e2e -- --project=chromium`.
- Integration preflight: `tests/integration/supabase.integration.test.ts`; run `pnpm test:integration`.
- Python ML: `ml-service/tests/`; run `pnpm test:ml:coverage` after installing the project's pytest dependencies.
- Input matrix source and expanded cells: `tests/matrix/input-cases.json` and `tests/matrix/input-cells.json`; regenerate with `pnpm test:matrix`.

Cross-browser and mobile Playwright projects, all navigation paths, API mutation role matrices, realtime typing indicators, concurrent upload/update races, rate limiting, reset-token expiry/reuse, and Python coverage remain unverified. Do not interpret the suite setup as complete coverage for those areas.
