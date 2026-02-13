# AddRan Wizard Integration Execution Plan

Date: 2026-02-13
Status: Execution baseline

## Purpose

This document is the implementation contract for integrating department wizard data into Sandra. It captures finalized decisions only.

Use this document for build and rollout work across:
- [`tcu-english-advising`](https://github.com/curtrode/tcu-english-advising)
- [`dcda-advisor-mobile`](https://github.com/curtrode/dcda-advisor-mobile)
- [`chat-ran-bot`](https://github.com/TCU-DCDA/chat-ran-bot)

> **Document location:** This file currently lives in `tcu-english-advising` because Phase 1 is the active work. After Phase 1, move it once to `chat-ran-bot` (the integration consumer) and keep permanent pointer files in wizard repos. When a shared coordination repo exists (Phase 5+), move it there as the canonical home and preserve pointer files in previous locations.

## Final Decisions

1. **Architecture**
- Use a hub-and-spoke model: each wizard publishes `manifest.json`; Sandra consumes manifests via a registry.

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
- Source of truth: `tcu-english-advising/schemas/manifest.schema.json`.
- DCDA and Sandra copy schema locally at `schemas/manifest.schema.json`.
- Add CI version pin checks in wizard repos and `chat-ran-bot` against source schema version.

8. **Observability**
- Structured logs in Cloud Functions for fetch/validate/fallback events.
- Log-based alert: email on sustained failures (more than 5 relevant `warn` logs in 1 hour).

## Phase Plan

| Phase | Repo | Branch | Deliverable |
|---|---|---|---|
| 1 | `tcu-english-advising` | `claude/chatbot-wizard-integration-fRndX` | Extract data from `App.jsx`, add manifest generator, publish `manifest.json`, add schema |
| 2 | `dcda-advisor-mobile` | `feature/manifest-export` | Add manifest generator, include contacts/career data, publish `manifest.json`, copy schema + CI version check |
| 3 | `chat-ran-bot` | `feature/wizard-manifests` | Add registry + loader + manifest-to-context, enable fallbacks, remove hardcoded English/DCDA context sources |
| 4 | Wizard repos + Sandra | N/A | Optional automation for faster refresh (if needed) |
| 5 | Future dept wizard repos | N/A | Onboarding template and registration flow |

## Detailed Implementation Requirements

### Phase 1: English Wizard (`tcu-english-advising`)

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

### Phase 2: DCDA Wizard (`dcda-advisor-mobile`)

1. Implement `scripts/generate-manifest.js` for DCDA data sources.
2. Add missing profile content (contacts/career options) in authoritative DCDA data.
3. Copy schema to `schemas/manifest.schema.json` and validate output at build time.
4. Publish `manifest.json` at deployed app base URL.
5. Add CI check to compare local schema version with source-of-truth schema version.

### Phase 3: Sandra (`chat-ran-bot`)

1. Add `functions/wizard-registry.json` with wizard manifest URLs.
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

6. Add CI schema version pin check in `chat-ran-bot`:
- Compare local `schemas/manifest.schema.json` version with source-of-truth schema version.
- Fail CI when versions diverge.

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
- DCDA `manifest.json` generated and deployed.
- Contacts/career profile data included in manifest Layer 1.
- Schema version check active in CI.

### Phase 3 Done
- Sandra consumes manifests for English/DCDA via registry.
- Hardcoded English/DCDA context paths removed or no longer authoritative.
- Fail-closed + fallback chain verified with test scenarios:
  - live URL failure
  - schema invalid payload
  - unknown `manifestVersion`
- Per-department single-flight verified: concurrent requests for same department produce only one live fetch.
- Logging and alerting configured.
- CI schema version pin check active.

## Non-Goals (Current Rollout)

- No admin UI for department self-service editing.
- No cross-instance distributed lock for manifest refresh.
- No external monitoring stack beyond Cloud Logging + one log-based alert.
- No hard requirement for full schema content-hash sync before Phase 5.

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

1. Move this execution plan to `chat-ran-bot` after Phase 1 merges, and keep a permanent pointer file in `tcu-english-advising`.
2. Move schema to shared repo/package when third wizard is onboarded. Move this execution plan there too as the canonical home, keeping pointer files in `chat-ran-bot` and wizard repos.
3. Add a cross-repo review rule for canonical plan changes (CODEOWNERS or equivalent approvals from `tcu-english-advising`, `dcda-advisor-mobile`, and `chat-ran-bot` maintainers).
4. Add stronger CI drift checks (content hash, not just version).
5. Consider webhook-triggered refresh if near-real-time update latency is needed.
