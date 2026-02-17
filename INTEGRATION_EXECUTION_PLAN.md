# AddRan Advising Ecosystem — Execution Plan

Date: 2026-02-14
Status: Phases 1–3 complete, Phase 4 ready

## Purpose

This document is the implementation contract for integrating department wizard data into Sandra as part of the **AddRan Advising Ecosystem**. It captures finalized decisions only.

Use this document for build and rollout work across:
- [`english-advising-wizard`](https://github.com/TCU-DCDA/english-advising-wizard)
- [`dcda-advising-wizard`](https://github.com/TCU-DCDA/dcda-advising-wizard)
- [`addran-advisor-chat`](https://github.com/TCU-DCDA/addran-advisor-chat)

**Related:** [TCU AI Innovation Prize](https://www.tcu.edu/ai/innovation-prize.php)

> **Document location:** This file lives in `english-advising-wizard` alongside all active project repos under `active/`. When a shared coordination repo exists (Phase 6+), move it there as the canonical home.

## FERPA Compliance

All projects in this ecosystem handle published academic program information (catalogs, requirements, career paths) — not student education records. No project connects to TCU identity systems (SSO, SIS, Registrar) or stores personally identifiable student data on external servers.

### Per-project status

| Project | Data model | FERPA exposure | User-facing notice |
|---|---|---|---|
| `english-advising-wizard` | Static program data, no user input | None | None required — add if user input features are added |
| `dcda-advising-wizard` | Student enters course selections; stored in browser `localStorage` only | None — data never leaves device | FERPA privacy dialog in WelcomeStep |
| `addran-advisor-chat` | Anonymous chat; conversations logged to Firestore without authentication or student identifiers | None — no PII, no linkage to student records | AI accuracy disclaimer in UI and PDF export |

### Constraints

These constraints apply to all current and future projects in the ecosystem:

1. **No authentication for student-facing tools.** Wizards and Sandra must not require TCU login or link sessions to student identity unless a formal privacy review is completed.
2. **No education records.** No project stores, transmits, or infers grades, GPA, transcripts, enrollment status, or academic standing.
3. **Local-first for student input.** When a wizard collects student course selections or planning data, storage must default to `localStorage`. Any transmission to an external server (e.g., Power Automate email workflow) requires explicit user consent and a visible privacy notice.
4. **Analytics must be aggregate-only.** Conversation analytics (Phase 4) derive anonymous counts and trends. No individual session reconstruction or user profiling.
5. **Manifest data is public.** Wizard manifests contain published program information (catalog data, requirements, contacts). Manifests must never include student data.
6. **Review trigger.** If any project adds authentication, integrates with a student records system, or transmits user-entered data to an external service, pause development and complete a FERPA impact review before deployment.

## Final Decisions

1. **Architecture**
- Use a hub-and-spoke model: each wizard publishes an advising manifest; Sandra consumes manifests via a registry with explicit URLs per wizard (manifest filenames may vary — e.g., `manifest.json` vs. `advising-manifest.json`).

2. **Manifest schema**
- Manifest contract is versioned (`manifestVersion`).
- Schema is required for producer and consumer validation.
- Invalid or unknown-version manifests are not partially ingested.

3. **Generator location**
- Standardize generator path to `scripts/generate-manifest.js` in wizard repos.

4. **Sandra refresh behavior**
- Use request-time TTL checks (1 hour) with stale-while-revalidate.
- Refresh is background/non-blocking for request latency.

5. **Single-flight and concurrency**
- Single-flight refresh is per department (not global), keyed by department in a `Map`.
- Design assumes concurrent async requests and multiple function instances.

6. **Fallback chain**
- Live manifest URL -> Firestore durable cache -> `program-data/*.json`.
- Fail closed per program on invalid schema or unknown `manifestVersion`.

7. **Schema governance (Phases 1-3)**
- Source of truth: `english-advising-wizard/schemas/manifest.schema.json`.
- DCDA and Sandra copy schema locally at `schemas/manifest.schema.json`.
- Add CI version pin checks in wizard repos and `addran-advisor-chat` against source schema version.

8. **Observability**
- Structured logs in Cloud Functions for fetch/validate/fallback events.
- Log-based alert: email on sustained failures (more than 5 relevant `warn` logs in 1 hour).

## Phase Plan

| Phase | Repo | Branch | Deliverable |
|---|---|---|---|
| 1 | `english-advising-wizard` | `claude/chatbot-wizard-integration-fRndX` | Extract data from `App.jsx`, add manifest generator, publish `manifest.json` at `https://tcu-dcda.github.io/english-advising-wizard/manifest.json`, add schema |
| 2 | `dcda-advising-wizard` | `feature/manifest-export` | Add manifest generator, include contacts/career data, publish `advising-manifest.json` at `https://dcda-advisor-mobile.web.app/advising-manifest.json`, copy schema + CI version check |
| 3 | `addran-advisor-chat` | `feature/wizard-manifests` | Add registry + loader + manifest-to-context, enable fallbacks, remove hardcoded English/DCDA context sources |
| 4 | `addran-advisor-chat` | `feature/analytics` | Enrich conversation documents, add FERPA-safe analytics dashboard |
| 5 | Wizard repos + Sandra | N/A | Optional automation for faster refresh (if needed) |
| 6 | Future dept wizard repos | N/A | Onboarding template and registration flow |

## Wizard Baseline Feature Checklist

All department wizards in the ecosystem must meet this baseline before onboarding to Sandra. This checklist defines the template for Phase 6 and identifies where existing wizards need remediation.

Legend: **Y** = has it, **N** = missing (needs work), **P** = partial

### Required

| # | Feature | English | DCDA | Notes |
|---|---------|---------|------|-------|
| 1 | FERPA privacy notice dialog | **N** | **Y** | English needs a notice added once user-input features exist (or now, as baseline policy) |
| 2 | AI accuracy disclaimer | N/A | N/A | Only required if wizard uses AI-generated content |
| 3 | No authentication | **Y** | **Y** | — |
| 4 | `localStorage` persistence | **N** | **Y** | English resets on refresh — needs save/restore |
| 5 | Import/export (CSV or JSON) | **N** | **Y** | English has no way to save/reload student work |
| 6 | PDF export (jsPDF or equivalent) | **P** | **Y** | English uses browser `window.print` — fragile on mobile, no custom layout |
| 7 | Advisor scheduling link | **N** | **Y** | English needs Calendly or equivalent link in UI |
| 8 | Print-friendly output | **Y** | **Y** | — |
| 9 | PWA manifest + service worker | **N** | **Y** | English has no PWA support — not installable, no offline |
| 10 | Mobile-first responsive design | **P** | **Y** | English is responsive but not mobile-first |
| 11 | Accessible UI primitives (ARIA) | **N** | **P** | English uses basic HTML; DCDA uses Radix but has a gap in NameStep |
| 12 | Keyboard navigation | **Y** | **Y** | — |
| 13 | TypeScript | **N** | **Y** | English is plain JavaScript — monolithic `App.jsx` |
| 14 | Modular component architecture | **N** | **Y** | English is a 1,953-line monolith |
| 15 | Test suite with CI | **N** | **Y** | English has no tests |
| 16 | GitHub Actions CI/CD | **P** | **Y** | English has deploy only, no test/schema check steps |
| 17 | App-level error boundary | **N** | **N** | Neither wizard has one |
| 18 | `data/courses.json` catalog | **P** | **Y** | English courses are hardcoded in `allCourses.js`, not JSON |
| 19 | `data/requirements.json` | **P** | **Y** | English uses `programs.json` with different structure |
| 20 | `data/offerings-{term}.json` | **N** | **Y** | English has no semester offerings data |
| 21 | `data/contacts.json` | **Y** | **Y** | — |
| 22 | `data/career-options.json` | **Y** | **Y** | — |
| 23 | `scripts/generate-manifest.js` | **Y** | **Y** | — |
| 24 | `schemas/manifest.schema.json` | **Y** | **Y** | — |
| 25 | Build-time schema validation | **Y** | **Y** | — |
| 26 | CI schema version check | **N** | **Y** | English is the schema source of truth, so not strictly needed — but should self-validate |

### Recommended

| # | Feature | English | DCDA | Notes |
|---|---------|---------|------|-------|
| 27 | Prerequisite data per course | **Y** | **N** | DCDA has no prerequisite mappings |
| 28 | Prerequisite validation/warnings | **Y** | **N** | DCDA relies on offerings data instead |
| 29 | Visual prerequisite chain/map | **Y** | **N** | — |
| 30 | Suggested semester sequences (4-year plan) | **Y** | **Y** | Different implementations — both adequate |
| 31 | Expected graduation date input | **Y** | **Y** | — |
| 32 | Capstone/senior requirement auto-scheduling | **N** | **Y** | — |
| 33 | Summer semester toggle | **N** | **Y** | — |
| 34 | Progress visualization (ring/bar/percentage) | **Y** | **Y** | DCDA has segmented progress bar + percentage hero (ui-refinement, merged 2026-02-17) |
| 35 | Category-by-category completion status | **Y** | **Y** | — |
| 36 | Student notes field | **N** | **Y** | — |

### Remediation summary

**English wizard (`english-advising-wizard`)** — needs significant work to reach baseline:
- Add FERPA notice dialog
- Add `localStorage` persistence (save/restore on refresh)
- Add CSV/JSON import/export
- Replace `window.print` with jsPDF export
- Add advisor scheduling link
- Add PWA support (manifest, service worker, install prompt)
- Migrate to TypeScript
- Refactor monolithic `App.jsx` into modular components
- Add test suite and CI test step
- Extract hardcoded course data to JSON files
- Add semester offerings data
- Add error boundary

**DCDA wizard (`dcda-advising-wizard`)** — close to baseline, minor gaps:
- Fix NameStep accessibility gap (add `role="radiogroup"` / `aria-pressed`)
- Add app-level error boundary
- Consider adding prerequisite data and validation (recommended, not required)
- ~~Consider adding visual progress indicator beyond text checklist~~ ✅ Done (segmented progress bar + ProgressHero, merged 2026-02-17)

> **Phase 6 action:** Use DCDA wizard as the template for new department wizards. The English wizard predates the ecosystem architecture and will require a dedicated remediation pass (can be scoped as a separate effort after Phase 3).

## Detailed Implementation Requirements

### Phase 1: English Wizard (`english-advising-wizard`)

1. Extract data from monolithic `App.jsx` into `src/data/` files:
- `programs.json`
- `contacts.json` (if separated)
- `prerequisites.json`
- `four-year-plans.json`
- `highlights.json` (if used for term highlights)

2. Implement `scripts/generate-manifest.js`:
- Read extracted data files.
- Produce `public/manifest.json`.
- Stamp `manifestVersion` and `lastUpdated`.

3. Add `schemas/manifest.schema.json`:
- Validate generated manifest at build time.
- Fail build on validation errors.

4. Build integration:
- Add `generate-manifest` npm script.
- Run generator before app build in CI/build pipeline.

### Phase 2: DCDA Wizard (`dcda-advising-wizard`)

1. Implement `scripts/generate-manifest.js` for DCDA data sources.
2. Add missing profile content (contacts/career options) in authoritative DCDA data.
3. Copy schema to `schemas/manifest.schema.json` and validate output at build time.
4. Publish `advising-manifest.json` at deployed app URL (`https://dcda-advisor-mobile.web.app/advising-manifest.json` — filename differs from English to avoid PWA manifest collision).
5. Add CI check to compare local schema version with source-of-truth schema version.

### Phase 3: Sandra (`addran-advisor-chat`)

1. Add `functions/wizard-registry.json` with explicit manifest URLs per wizard (English: `https://tcu-dcda.github.io/english-advising-wizard/manifest.json`, DCDA: `https://dcda-advisor-mobile.web.app/advising-manifest.json`).
2. Add `functions/manifest-loader.js` with:
- Request-time TTL check (`1 hour`).
- SWR background refresh.
- Per-department single-flight (`Map<department, Promise>`).
- One retry with 5-second delay, then wait for next TTL window.
- Durable cache read/write in Firestore (`manifests/{department}`).

3. Add validation and fail-closed behavior:
- Validate against `schemas/manifest.schema.json`.
- Reject unknown `manifestVersion` values and fallback.
- No partial ingest of invalid manifests.

4. Add `functions/manifest-to-context.js`:
- Convert valid manifests to Sandra context blocks.
- Prefer manifest data for wizard departments.
- Keep `program-data/*.json` fallback for non-wizard departments and failures.

5. Update `functions/index.js`:
- Replace hardcoded English/DCDA context sources with loader + converter.

6. Add CI schema version pin check in `addran-advisor-chat`:
- Compare local `schemas/manifest.schema.json` version with source-of-truth schema version.
- Fail CI when versions diverge.

### Phase 4: Sandra Analytics (`addran-advisor-chat`)

FERPA compliance constraint: Sandra has no authentication and collects no PII. All analytics are anonymous aggregate metrics derived from conversation documents already stored in Firestore. No student identity linkage exists or is introduced. This phase does not change what data is collected — it enriches existing documents at write time and adds dashboard visualizations.

#### Tier 1: Server-side enrichment (low effort)

Enrich the existing `conversations` document written at chat time in `functions/index.js`:

New fields added at write time:
- `sessionId` — anonymous session token from client (already sent in feedback, not yet stored in conversations).
- `hour` — integer 0–23, derived from server timestamp.
- `dayOfWeek` — integer 0–6 (Sunday = 0), derived from server timestamp.
- `topics` — string array, server-side topic detection (reuse keyword patterns from admin.js `computeTopTopics`, run server-side).
- `programs` — string array, server-side program mention detection (reuse patterns from admin.js `computeTopPrograms`, run server-side).
- `exchangeIndex` — integer, nth message in this session (derived from `conversationHistory` length).

Move topic and program detection logic from client-side `admin.js` to a shared server-side function so enrichment happens once at write time rather than recomputed on every admin page load.

#### Tier 2: Admin dashboard visualizations (moderate effort)

New views in `admin.html` / `admin.js`, all computed from enriched conversation documents:

1. **Time-of-use heatmap** — hour (y-axis) x day-of-week (x-axis), cell color = conversation count. Shows when students use Sandra.
2. **Traffic over time** — daily conversation count line chart. Shows seasonal patterns and registration spikes.
3. **Session depth histogram** — distribution of exchanges per session. Shows whether students get answers quickly or struggle.
4. **Topic trend lines** — topic counts per week over time. Shows which advising topics are growing or declining.
5. **Program popularity ranking** — bar chart with trend arrows (up/down vs. prior period). Shows which programs generate the most interest.
6. **Content gap report** — topics correlated with negative feedback or single-exchange sessions. Flags where Sandra's data may be incomplete.

No new backend endpoints required — existing `adminConversations` endpoint returns enriched documents. Pagination enhancement: raise or remove the current 200-document limit, or add date-range query parameters.

#### Tier 3: Claude-powered classification (optional, higher effort)

- Use Claude to classify each user message into a structured taxonomy (program inquiry, career question, requirement question, scheduling, general) at write time.
- Adds ~$0.001 per classification in API cost.
- Produces higher-quality topic tags than regex patterns.
- Defer to post-launch if Tier 1+2 prove sufficient.

## Loader Behavior Spec (Phase 3)

For each department request path:
1. Read in-memory cache entry.
2. If cache missing, load Firestore cached manifest (if valid), else static fallback. Trigger an immediate background live fetch regardless of TTL (cold-miss refresh).
3. If TTL expired, trigger background refresh unless same department refresh is already in flight.
4. On live fetch success and valid schema/version, update in-memory + Firestore.
5. On live fetch failure or validation/version failure, keep serving fallback chain.
6. Emit structured logs for each fetch/validate/fallback path.

## Schema and Version Policy

1. Current supported version: `1.0`.
2. Unknown version behavior: `warn + fallback`, do not parse.
3. Version bump owner: developer maintaining all three repos.
4. Transition rule for version bumps:
- Sandra must support old and new versions before wizard manifests switch to new version.

## Observability and Alerting

Required structured logs:
- Manifest fetch success (`department`, `manifestVersion`, `lastUpdated`, `fetchDurationMs`)
- Manifest fetch failure (`department`, `manifestUrl`, `error`, `fallbackSource`)
- Schema/version validation failure (`department`, `validationErrors`, `fallbackSource`)
- Fallback usage (`department`, `fallbackSource`, `cachedAge` when applicable)
- TTL refresh trigger (`department`, `staleDurationMs`)

Minimum alert at launch:
- Threshold: more than 5 warning logs related to manifest fetch/validation failures in 1 hour
- Action: email notification to maintainer

## Definition of Done by Phase

### Phase 1 Done
- English app behavior unchanged after data extraction.
- `public/manifest.json` generated in build and deployed.
- Build fails on schema-invalid manifest output.

### Phase 2 Done
- DCDA `advising-manifest.json` generated and deployed at `https://dcda-advisor-mobile.web.app/advising-manifest.json`.
- Contacts/career profile data included (12 careers, Dr. Curt Rode contact).
- Schema version check active in CI.
- CORS + cache headers configured in Firebase hosting.

### Phase 3 Done ✓
- Sandra consumes manifests for English/DCDA via registry. **Merged PR #1, deployed 2026-02-15.**
- Hardcoded English/DCDA context paths removed (`buildDcdaContext()`, 46-line English string, `dcda-data.json` import).
- Fail-closed + fallback chain verified:
  - DCDA static fallback files created (`program-data/digital-culture-and-data-analytics*.json`)
  - Firestore cache revalidated with AJV + version check before use
  - Invalid cache entries logged at WARNING severity (`firestore_cache_invalid`)
- Per-department single-flight verified: concurrent requests for same department produce only one live fetch.
- Structured logging active for all fetch/validate/fallback events.
- CI schema version pin check active (`.github/workflows/schema-check.yml`).
- Production smoke tests passed: English (manifest), DCDA (manifest), History (program-data unchanged).
- Runtime updated to Node.js 22.

### Phase 4 Done
- Conversation documents include `sessionId`, `hour`, `dayOfWeek`, `topics`, `programs`, and `exchangeIndex`.
- Topic and program detection runs server-side at write time.
- Admin dashboard includes time-of-use heatmap, traffic-over-time chart, session depth histogram, topic trends, program popularity, and content gap report.
- Admin conversations endpoint supports date-range queries or pagination beyond 200 documents.
- No PII collected. No authentication added to chat. No linkage to student identity systems.

## Non-Goals (Current Rollout)

- No admin UI for department self-service editing.
- No cross-instance distributed lock for manifest refresh.
- No external monitoring stack beyond Cloud Logging + one log-based alert.
- No hard requirement for full schema content-hash sync before Phase 6.

## Department Wizard Names

Each department wizard has a named persona for student-facing identity:

| Wizard Name | Department | Code |
|---|---|---|
| Sandra | AddRan College (chatbot) | — |
| Engelina | English | ENGL |
| Ada | DCDA | DCDA |
| Polly | Political Science | POSC |
| Deacon | Economics | ECON |
| Hester | History | HIST |
| Cruz | Criminal Justice | CRJU |
| Anton | Anthropology | ANTH |
| Sofia/Sophie | Sociology | SOCI |
| Philomena | Philosophy | PHIL |
| Lola | Modern Languages | MOLA |
| George | Geography | GEOG |
| Aurelia | Religion | RELI |

## Post-Launch Follow-ups

1. Move schema to shared repo/package when third wizard is onboarded. Move this execution plan there too as the canonical home.
2. Add a cross-repo review rule for canonical plan changes (CODEOWNERS or equivalent approvals from `english-advising-wizard`, `dcda-advising-wizard`, and `addran-advisor-chat` maintainers).
3. Add stronger CI drift checks (content hash, not just version).
4. Consider webhook-triggered refresh if near-real-time update latency is needed.
