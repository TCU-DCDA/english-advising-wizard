# AddRan Advising Integration Plan: Chatbot + Department Wizards

> Execution note: The authoritative implementation plan is in `INTEGRATION_EXECUTION_PLAN.md`.  
> Use this file for strategy, architecture rationale, and review history.

## Problem

Sandra (the AddRan chatbot) and the department wizards (English, DCDA, and future departments) maintain **separate copies** of program data. When a wizard is updated — courses added, requirements changed, contacts corrected — Sandra's knowledge becomes stale. This will only get worse as more departments build wizards.

## Current Data Architecture (The Problem in Detail)

Each app has its own data format and its own copy of the truth:

| Data Point | Sandra (chatbot) | English Wizard | DCDA Wizard |
|---|---|---|---|
| **Program overview** | `program-data/english.json` (lightweight: name, degree, hours, career options) | Hardcoded in `App.jsx` `COURSE_DATA` | `data/requirements.json` |
| **Course lists** | Summarized in hardcoded `englishContext` string (~50 lines) | Full catalog: 200+ courses with codes, titles, hours, levels | `data/courses.json`: 100+ courses with descriptions |
| **Requirements** | Brief category names + example courses | Complete: every course option per category, hour limits, lower-division caps | Complete: categories with select-one logic, prerequisites |
| **Prerequisites** | Not tracked | Full prerequisite chains (`PREREQUISITES` object) | Category-level prerequisites + mutual exclusions |
| **Contacts** | In `program-data/english.json` | Not included | Not included |
| **Semester offerings** | Spring 2026 highlights (7 courses, hardcoded) | Not included | `data/offerings-sp26.json` (26 courses with sections, schedules, enrollment) |
| **Four-year plans** | Not included | Full `FOUR_YEAR_PLANS` object | Not included |

Sandra has **breadth** (60 programs, contacts, career options) but **shallow depth** per program.
Wizards have **depth** (full course catalogs, prerequisites, offerings) but only for their department.

The integration should give Sandra access to the wizard-level depth, automatically.

---

## Architecture: Hub-and-Spoke with a Data Contract

```
                        ┌──────────────────────┐
                        │   Sandra (Chatbot)    │
                        │   Firebase Functions  │
                        │                       │
                        │  Reads manifests at   │
                        │  startup or on demand │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
          ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
          │   English   │ │    DCDA     │ │  Future     │
          │   Wizard    │ │    Wizard   │ │  Dept       │
          │             │ │             │ │  Wizard     │
          │ Publishes:  │ │ Publishes:  │ │ Publishes:  │
          │ manifest.json│ │ manifest.json│ │ manifest.json│
          └─────────────┘ └─────────────┘ └─────────────┘
```

### The Wizard Manifest: A Standard Data Contract

Every department wizard publishes a single `manifest.json` file alongside its deployed app. This file is the **contract** between the wizard and Sandra. It contains two layers:

- **Layer 1 — Program Profile** (what Sandra needs for general questions): program name, degree, total hours, descriptions, career options, contacts, advising URL
- **Layer 2 — Detailed Advising Data** (what Sandra needs for specific questions): full requirement categories with course lists, prerequisites, semester offerings, four-year plans, enrollment warnings

Sandra fetches and caches these manifests. When a student asks "What courses count for the English major's American Literature requirement?", Sandra has the full answer — sourced live from the English wizard's published data.

---

## Manifest Schema (v1)

```jsonc
{
  "manifestVersion": "1.0",
  "department": "English",
  "lastUpdated": "2026-02-13T00:00:00Z",
  "wizardUrl": "https://curtrode.github.io/tcu-english-advising/",

  // Layer 1: Program profiles (replaces program-data/*.json in Sandra)
  "programs": [
    {
      "id": "english-ba",
      "name": "English",
      "abbreviation": "ENGL",
      "degree": "BA",
      "totalHours": 33,
      "url": "https://www.tcu.edu/academics/programs/english.php",
      "descriptions": ["..."],
      "careerOptions": ["Lawyer", "Digital Content Manager", ...],
      "contacts": [
        {
          "role": "Department Chair",
          "name": "Dr. Sharon Weltman",
          "email": "sharon.weltman@tcu.edu",
          "phone": "817-257-7240",
          "office": "Reed 314A"
        }
      ],
      "internship": { "description": "WRIT 40273 - Writing Internship..." },

      // Layer 2: Detailed requirement data
      "requirements": {
        "maxLowerDivision": 9,
        "categories": [
          {
            "id": "americanLit",
            "name": "American Literature",
            "hours": 6,
            "courses": [
              { "code": "ENGL 20503", "title": "American Writers", "hours": 3, "level": "lower" },
              { "code": "ENGL 30133", "title": "American Literature to 1865", "hours": 3 }
            ]
          }
          // ... more categories
        ],
        "overlays": [
          {
            "id": "earlyLit",
            "name": "Early Literature & Culture",
            "hours": 6,
            "courses": [...]
          }
        ]
      },

      // Optional enrichments
      "prerequisites": {
        "CRWT 30343": ["CRWT 10203", "CRWT 20103", "CRWT 20133"]
      },
      "fourYearPlan": {
        "year1": { "fall": [...], "spring": [...] }
      },
      "highlightedCourses": {
        "term": "Spring 2026",
        "courses": [
          { "code": "ENGL 30653", "title": "Jane Austen: Novels and Films" }
        ]
      }
    }
    // ... additional programs (Writing & Rhetoric, Creative Writing, minors)
  ],

  // Optional: Full course catalog (for deep questions)
  "courseCatalog": [
    {
      "code": "ENGL 20503",
      "title": "American Writers",
      "hours": 3,
      "level": "lower",
      "description": "Survey of major American authors..."
    }
  ],

  // Optional: Current semester offerings
  "offerings": {
    "term": "Spring 2026",
    "updated": "2026-01-06",
    "sections": [
      {
        "code": "ENGL 30653",
        "title": "Jane Austen: Novels and Films",
        "schedule": "TR 11:00-12:20",
        "modality": "In Person",
        "enrollment": "22/25",
        "status": "Open"
      }
    ]
  },

  // Optional: Department-specific warnings or policies
  "advisingNotes": [
    "Students who declared Fall 2025 may count 12 lower-division hours for Writing & Rhetoric",
    "Only 3 lower-division hours count toward Creative Writing major"
  ]
}
```

### Why This Schema Works for Any Department

The schema captures what all programs share:
- Programs have names, degrees, hours, contacts, career options (Layer 1)
- Programs have requirement categories with course lists (Layer 2)
- Some programs have prerequisites, offerings, four-year plans (optional enrichments)

A History department wizard would produce the same structure. So would Political Science, Sociology, or any future department. The schema doesn't assume anything English- or DCDA-specific.

---

## Implementation Plan

### Phase 1: Create the manifest generator for this repo (English Wizard)

**Goal:** The English wizard publishes `manifest.json` as part of its build, containing all three majors (English, Writing & Rhetoric, Creative Writing) plus their full course data.

**Changes to `tcu-english-advising`:**
1. Create `scripts/generate-manifest.js` — a build-time script that reads `COURSE_DATA`, `PREREQUISITES`, `FOUR_YEAR_PLANS`, and contact info from `App.jsx` (or extracted data files) and writes `public/manifest.json`
2. Add a `generate-manifest` npm script
3. Update `vite.config.js` or `package.json` build script to run the generator before build
4. The manifest is deployed to GitHub Pages alongside the app at `https://curtrode.github.io/tcu-english-advising/manifest.json`

**Data extraction prerequisite:** The `COURSE_DATA`, `PREREQUISITES`, and `FOUR_YEAR_PLANS` objects currently live inside `App.jsx` (a 2,167-line file). They should be extracted into separate JSON/JS data files (`src/data/programs.json`, `src/data/prerequisites.json`, `src/data/four-year-plans.json`) so both the React app and the manifest generator can import them. This also makes the data easier to maintain.

### Phase 2: Create the manifest generator for DCDA Wizard

**Goal:** The DCDA wizard publishes `manifest.json` alongside its deployed app.

**Changes to `dcda-advisor-mobile`:**
1. Create `scripts/generate-manifest.js` — reads `data/requirements.json`, `data/courses.json`, `data/offerings-sp26.json` and writes `public/manifest.json`
2. Add contacts and career options (currently only in Sandra's `program-data/` files — these should be added to the DCDA wizard's data or pulled from Sandra's existing files during generation)
3. Update build script to run the generator
4. Manifest deployed to Firebase Hosting at the app's base URL

### Phase 3: Sandra consumes manifests instead of maintaining duplicate data

**Goal:** Sandra fetches wizard manifests at startup and uses them to build her context, replacing the hardcoded `englishContext` and the manually maintained `dcda-data.json`.

**Changes to `chat-ran-bot`:**
1. Create `functions/wizard-registry.json` — a simple registry of wizard URLs:
   ```json
   {
     "wizards": [
       {
         "department": "English",
         "manifestUrl": "https://curtrode.github.io/tcu-english-advising/manifest.json"
       },
       {
         "department": "DCDA",
         "manifestUrl": "https://dcda-advisor-mobile.web.app/manifest.json"
       }
     ]
   }
   ```
2. Add `functions/manifest-loader.js` — fetches and caches manifests at function startup (cold start) with a configurable TTL (e.g., 1 hour). Falls back to last-known-good cache on fetch failure.
3. Add `functions/manifest-to-context.js` — converts a manifest into the context string format Sandra's system prompt expects. This replaces:
   - The hardcoded `englishContext` block (lines 454-499 of `index.js`)
   - The `buildDcdaContext()` function for DCDA
   - The relevant entries in `program-data/*.json` (the manifest's Layer 1 data supersedes these)
4. Update `index.js` to call the manifest loader and context builder instead of using hardcoded data
5. Sandra's system prompt gets richer, more accurate data — and it stays current automatically

**Backward compatibility:** Sandra keeps her existing `program-data/*.json` files for the ~55 departments that don't have wizards yet. Manifest data takes priority when available; program-data files serve as fallback.

### Phase 4: Automated refresh via GitHub Actions

**Goal:** When a wizard's data changes, Sandra automatically picks up the new manifest.

**Option A — Cold-start refresh (simplest):**
Sandra's Cloud Functions already reload data on cold start. If the manifest loader fetches on each cold start (or checks a TTL), no automation is needed — Sandra will pick up changes within ~1 hour naturally as Cloud Functions recycle.

**Option B — Webhook-triggered redeploy (most reliable):**
1. Add a GitHub Action to each wizard repo that, on push to `main`, calls a Sandra webhook endpoint
2. Sandra's webhook clears the manifest cache, forcing a re-fetch on the next request
3. Or: the GitHub Action triggers `firebase deploy --only functions` on Sandra's repo

**Recommendation:** Start with Option A. It's zero-config and good enough for programs that change a few times per semester. Move to Option B only if near-real-time sync becomes important.

### Phase 5: New department onboarding (the scalability test)

**When a new department (e.g., History) wants a wizard:**

1. **Fork/clone the wizard template** — create a new repo from a template that includes the manifest generator scaffold and the standard data file structure
2. **Fill in their data** — `data/programs.json`, `data/courses.json`, etc., following the schema
3. **Deploy** — the build automatically generates `manifest.json`
4. **Register with Sandra** — add one entry to `wizard-registry.json` and redeploy Sandra

Sandra immediately starts answering detailed History questions using the wizard's authoritative data. No changes to Sandra's core code.

Over time, as this pattern proves out, a **wizard starter kit** (template repo + documentation + example data) would make it turnkey for any department chair or faculty advisor to get started.

---

## Repositories

| Repo | URL |
|---|---|
| `tcu-english-advising` | https://github.com/curtrode/tcu-english-advising |
| `dcda-advisor-mobile` | https://github.com/curtrode/dcda-advisor-mobile |
| `chat-ran-bot` | https://github.com/TCU-DCDA/chat-ran-bot |

## What Changes Where (Summary)

| Repo | What Changes | Why |
|---|---|---|
| `tcu-english-advising` | Extract data from App.jsx into JSON files; add manifest generator; build script update | Publish authoritative English data as manifest.json |
| `dcda-advisor-mobile` | Add manifest generator; add contacts/career data; build script update | Publish authoritative DCDA data as manifest.json |
| `chat-ran-bot` | Add wizard registry, manifest loader, manifest-to-context builder; refactor index.js to use them; remove hardcoded englishContext | Consume wizard data dynamically instead of maintaining duplicates |

---

## Data Flow After Integration

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  English Wizard         │     │  DCDA Wizard            │
│  (GitHub Pages)         │     │  (Firebase Hosting)     │
│                         │     │                         │
│  npm run build          │     │  npm run build          │
│    └─ generate manifest │     │    └─ generate manifest │
│    └─ build React app   │     │    └─ build React app   │
│                         │     │                         │
│  Deployed files:        │     │  Deployed files:        │
│  ├─ index.html          │     │  ├─ index.html          │
│  ├─ assets/...          │     │  ├─ assets/...          │
│  └─ manifest.json  ◄───┐     │  └─ manifest.json  ◄───┐
└─────────────────────┼───┘     └─────────────────────┼───┘
                      │                               │
                      │         fetch on cold start    │
                      │              │                │
                      └──────────┐   │   ┌────────────┘
                                 ▼   ▼   ▼
                        ┌──────────────────────┐
                        │  Sandra (Chatbot)     │
                        │                       │
                        │  wizard-registry.json  │
                        │  ┌─ English → URL     │
                        │  ┌─ DCDA → URL        │
                        │  └─ (future depts)    │
                        │                       │
                        │  On cold start:       │
                        │  1. Fetch manifests   │
                        │  2. Build contexts    │
                        │  3. Merge with        │
                        │     program-data/     │
                        │     (for non-wizard   │
                        │      departments)     │
                        │  4. Answer questions   │
                        │     with full data    │
                        └──────────────────────┘
```

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Manifest fetch fails (DNS, HTTP error, timeout, hosting outage) | Stale-while-revalidate with request-time TTL checks; Firestore durable cache as fallback; existing `program-data/*.json` as last resort |
| Manifest schema drift across departments | Version field (`manifestVersion: "1.0"`) + validation on load; reject/warn on unknown versions |
| Context window bloat as more wizards join | Selective context: only include detailed data for programs mentioned in the conversation (Sandra already does this pattern with `detectProgramMentions`) |
| Department publishes invalid data | Schema validation in manifest loader; log warnings but don't crash — use fallback data |

---

## Phase 1 Scope (This PR)

For this branch (`claude/chatbot-wizard-integration-fRndX`), the deliverable is:

1. **Extract** `COURSE_DATA`, `PREREQUISITES`, and `FOUR_YEAR_PLANS` from `App.jsx` into standalone data files under `src/data/`
2. **Create** `scripts/generate-manifest.js` that produces a `manifest.json` following the schema above
3. **Update** the build pipeline to generate the manifest before building
4. **Add** the manifest schema documentation
5. **Verify** the React app still works identically after the data extraction

This establishes the pattern. Phases 2-5 follow in their respective repos.

---

## Key Architectural Decisions

These decisions were made during planning and should be treated as settled unless revisited explicitly.

### 1. DCDA Wizard Is the Template Architecture

Both wizards were evaluated for scalability. The **DCDA wizard's architecture** is the model for future department wizards:

- **TypeScript** with full interfaces in `types/index.ts` — enforces the data contract at compile time
- **Data separated into JSON files** (`data/requirements.json`, `data/courses.json`, `data/offerings-sp26.json`) — editable without touching application code
- **Modular components** — 20+ files across `components/`, `hooks/`, `services/` directories
- **Custom hooks** (`useStudentData`, `useWizardFlow`, `useRequirements`) — reusable logic separated from UI
- **Generic wizard flow** — `useWizardFlow` takes a list of steps, not hardcoded to any department
- **Tests** (vitest + Testing Library)
- **PWA-enabled** (offline, installable)

The English wizard has valuable **content features** that the DCDA wizard lacks (prerequisite chain visualization, four-year planning, PDF export, course catalog search). These should be preserved and eventually generalized, but the DCDA wizard's structural patterns should be adopted.

The English wizard is currently a monolith: `App.jsx` is 2,167 lines containing all data, all components, and all logic. Phase 1 begins the migration by extracting data into standalone files. Full modularization (separate component files, TypeScript, custom hooks) is a future effort.

### 2. No Department Chatbots — Sandra Is the Single Conversational Interface

There is no value in creating per-department chatbots. Sandra already answers department-specific questions for all 60 AddRan programs. With manifest data, she'll have wizard-level depth for every department that publishes one. A department chatbot would just be a worse Sandra that only knows one department.

The correct architecture:
- **General question** → Sandra (conversational, breadth across all departments)
- **Degree planning** → Department Wizard (structured UI, interactive, stateful)
- **Sandra detects planning intent** → Links student to the relevant wizard

### 3. Fallback-First Strategy for Sandra

When Sandra consumes manifests (Phase 3), the design is **additive, not destructive**:

- Sandra keeps all existing `program-data/*.json` files for the ~55 departments without wizards
- For departments with wizards, manifest data takes priority
- If a manifest fetch fails, Sandra falls back to her existing data — she never gets *worse*
- This means the Sandra refactoring can be merged even before any wizards publish manifests

### 4. File-Per-Concern Data Layout

Instead of one large data file per department, data is split by update frequency:

```
src/data/
  programs.json        ← requirements, hours, categories (changes rarely)
  contacts.json        ← names, emails, offices (changes occasionally)
  prerequisites.json   ← course chains (changes rarely)
  four-year-plans.json ← suggested sequences (changes per semester)
  highlights.json      ← featured courses for current term (changes every semester)
```

This matters because department contacts share data via email. When someone says "here are the highlighted courses for Fall 2027," the maintainer edits only `highlights.json` without risk of breaking requirement logic. Each file is small, focused, and hard to mess up.

### 5. Content Management: Developer-Managed with Structured Files (Option A)

The current workflow: department contacts email updates, a developer translates them into code/JSON and deploys. The integration plan optimizes this handoff rather than replacing it:

- **Phase 1** makes updates faster: editing a focused JSON file instead of a 2,167-line JSX component
- **Build-time validation** via the manifest generator catches typos before they reach students
- **No admin panel needed yet** — that's only justified when multiple department admins need self-service

The typical semester rhythm:
- **Before each semester:** Update `highlights.json` and offerings. ~15 minutes per department.
- **Once a year (catalog changes):** Update `programs.json`. Less frequent, more careful.
- **Occasionally:** Update `contacts.json`. Trivial.

This is sustainable for one person managing 3+ department wizards. An admin panel (Option B) would only be built if 10+ departments need updates in the same window.

### 6. Branching Strategy Across Three Repos

Each repo's changes are independent until Phase 3. Nothing depends on anything else until Sandra starts fetching manifests.

| Phase | Repo | Branch | Risk | Can Merge Independently |
|---|---|---|---|---|
| 1 | `tcu-english-advising` | `claude/chatbot-wizard-integration-fRndX` | Low — app renders identically, data just moves to files | Yes |
| 2 | `dcda-advisor-mobile` | `feature/manifest-export` | Very low — purely additive, new files only | Yes |
| 3 | `chat-ran-bot` | `feature/wizard-manifests` | Medium — refactors index.js, but with fallbacks | Yes (falls back to existing data) |

Each step is independently mergeable and independently revertible. At no point does merging one repo require the others to be done.

---

## Independent Review Addendum (2026-02-13)

### Assessment Summary

This plan is directionally strong and scalable, but there are a few execution details that should be clarified before implementation:

1. **High:** The refresh strategy may leave manifests stale if refresh checks only happen on cold start.
2. **High:** "Last-known-good local cache" is not durable across function instance recycling, so fallback guarantees are weaker than stated.
3. **Medium:** Phase 1 generator location is inconsistent (`src/manifest-generator.js` vs `scripts/generate-manifest.js`).
4. **Medium:** The plan calls for schema validation, but does not define cross-repo producer-consumer contract tests.
5. **Low:** The CORS risk is likely mis-scoped for backend manifest fetches (network/auth/url failures are more likely).

### Questions for Claude

1. Should Sandra perform TTL checks at request time (or background refresh) rather than relying primarily on cold-start refresh?
2. Where should durable fallback manifests be stored (for example, Firestore, Cloud Storage, or checked-in snapshots)?
3. Which path is authoritative for the Phase 1 generator: `src/manifest-generator.js` or `scripts/generate-manifest.js`?
4. Should we add a shared JSON Schema plus CI contract tests in each repo before rollout?
5. Do we want to revise the risk table language so backend fetch failures are categorized by actual failure modes (auth, DNS, outage, invalid payload) instead of CORS?

---

### Responses to Codex Review

#### 1. Refresh strategy — TTL at request time vs. cold-start only

**Agreed, this is a real gap.** Cold-start-only refresh is unreliable because Firebase Cloud Functions can stay warm for hours (or days under steady traffic), meaning Sandra could serve stale manifest data long after a wizard deploys updates.

**Resolution: In-memory TTL check on every request.** The manifest loader should store a `lastFetched` timestamp alongside the cached manifest. On each incoming request, check `Date.now() - lastFetched > TTL`. If expired, re-fetch in the background (serve stale data for the current request, update for the next one). This is a "stale-while-revalidate" pattern:

- TTL of **1 hour** is fine for our update cadence (a few times per semester).
- The fetch happens async — it never blocks the user's response.
- If the background fetch fails, the cached data persists until the next successful fetch.

This keeps Option A's simplicity while closing the staleness gap. The Phase 3 implementation of `manifest-loader.js` should include this from the start.

#### 2. Durable fallback storage

**Agreed — in-memory cache dies with the function instance.** The plan's "last-known-good cache" language was imprecise.

**Resolution: Firestore as the durable cache.** After each successful manifest fetch, write the manifest to a Firestore document (e.g., `manifests/{department}`). On cold start, the loader checks Firestore first (fast, same-project, no auth needed), then fetches the live manifest URL to update it. This gives us:

- **Cold start with live URL down:** Firestore has the last-known-good manifest. Sandra answers with slightly stale but complete data.
- **Cold start with Firestore empty (first deploy):** Falls back to existing `program-data/*.json` files — the baseline that already works today.
- **No external dependencies:** Firestore is already in the project (Sandra uses it for conversation history).

Cloud Storage would also work but adds a second service. Checked-in snapshots would require redeploying Sandra whenever a wizard updates, which defeats the purpose. Firestore is the right fit.

#### 3. Generator file location

**Good catch — this was inconsistent.** The plan mentions `src/manifest-generator.js` in Phase 1 but `scripts/generate-manifest.js` in Phase 2.

**Resolution: `scripts/generate-manifest.js` for all repos.** The generator is a build-time Node script, not a React source file — it doesn't belong in `src/`. Using `scripts/` is the convention in the DCDA wizard already, and it signals clearly that this code runs at build time, not at runtime. The Phase 1 description (Section "Phase 1: Create the manifest generator for this repo") should be updated to read `scripts/generate-manifest.js`.

#### 4. Shared JSON Schema and contract tests

**Agreed in principle, but phased.** A formal JSON Schema for `manifest.json` is valuable and should exist. CI contract tests in each repo are the right long-term goal. But for the initial rollout with 2 wizards, the cost-benefit doesn't justify blocking Phase 1-2 on this.

**Resolution — phased approach:**
- **Phase 1-2 (now):** Add a `manifest.schema.json` file to the `tcu-english-advising` repo (or a shared location). The manifest generator validates its own output against this schema at build time. If validation fails, the build fails. This catches producer-side errors before deployment.
- **Phase 3:** Sandra's manifest loader validates incoming manifests against the same schema. Log warnings for invalid fields but don't reject the whole manifest (graceful degradation).
- **Phase 5+ (when 3+ wizards exist):** Publish the schema as a shared npm package or a standalone repo that all wizard repos reference. Add CI tests that fetch the published schema and validate against it.

For 2 wizards, a copy of the schema in each repo is fine. The schema is small and changes rarely.

#### 5. Risk table — CORS vs. actual failure modes

**Agreed — CORS is a red herring for server-to-server fetches.** Sandra's Cloud Functions fetch manifests from the backend, not from a browser. CORS headers are irrelevant. The actual failure modes are:

- **DNS/network failure** — the wizard's hosting is unreachable
- **HTTP errors** — 404 (manifest path wrong), 403 (misconfigured hosting), 500 (hosting outage)
- **Invalid payload** — valid HTTP response but malformed or schema-violating JSON
- **Timeout** — slow response from GitHub Pages or Firebase Hosting under load

**Resolution:** The risk table should be updated to replace the CORS row with these actual failure modes. The Firestore durable cache (answer #2) and schema validation (answer #4) together cover all of them. Here's the revised row:

| Risk | Mitigation |
|---|---|
| ~~CORS blocks manifest fetch~~ Manifest fetch fails (DNS, HTTP error, timeout, hosting outage) | Stale-while-revalidate with in-memory TTL; Firestore durable cache as fallback; existing `program-data/*.json` as last resort. Schema validation catches malformed payloads without crashing. |

---

### Action Items from Review

These should be incorporated into the implementation:

- [ ] Update Phase 1 generator path to `scripts/generate-manifest.js`
- [ ] Add `manifest.schema.json` to Phase 1 deliverables
- [ ] Design `manifest-loader.js` (Phase 3) with stale-while-revalidate pattern from the start
- [ ] Use Firestore for durable manifest cache in Phase 3
- [ ] Revise the Risks table to reflect actual backend failure modes
- [ ] Remove CORS from the risk table

---

### Follow-up Questions for Claude

1. For invalid `manifestVersion` or schema validation failure, should Sandra fail closed per program and use fallback data instead of partially ingesting invalid manifest content?
2. What is the single source of truth for `manifest.schema.json` during Phases 1-3 (exact repo and file path)?
3. Should `manifest-loader.js` implement single-flight refresh and retry backoff to prevent concurrent fetch storms after TTL expiry?
4. What is the exact unknown-version policy (`warn`, `reject`, `fallback`) and who owns version bump coordination?
5. What launch observability is required (fetch success rate, schema validation failures, fallback usage, manifest age/staleness)?

---

### Responses to Follow-up Questions

#### 1. Fail closed per program on invalid manifests — yes

**Sandra should fail closed per program, not partially ingest.** If a manifest fails schema validation or has an unrecognized `manifestVersion`, Sandra should:

1. **Discard the entire invalid manifest** for that department
2. **Fall back** to the Firestore cached version (last-known-good), or if none exists, to `program-data/*.json`
3. **Log a warning** with the department name, the validation errors, and the manifest URL

Partial ingestion is dangerous — a malformed `requirements` block could cause Sandra to give students wrong advising information. That's worse than serving slightly stale data. The fallback chain is always: live manifest → Firestore cache → static program-data files. Each layer is a complete dataset, never a partial merge of valid and invalid content.

#### 2. Single source of truth for the schema: `tcu-english-advising`

During Phases 1-3, the authoritative schema lives at:

```
tcu-english-advising/schemas/manifest.schema.json
```

Rationale: this is the first repo to implement the manifest generator (Phase 1), so the schema is authored and validated here first. The DCDA wizard (Phase 2) copies the schema into its own repo at `schemas/manifest.schema.json` — a simple copy is fine for 2 repos. Sandra (Phase 3) also gets a copy for consumer-side validation.

When Phase 5+ adds a third wizard, the schema should move to its own shared location (a dedicated repo or npm package). But for now, the English wizard repo is the origin and the other repos track it manually. If the schema changes, the developer updates all three — acceptable overhead for a file that changes very rarely.

#### 3. Single-flight refresh and retry backoff — yes, but keep it simple

**Single-flight: yes.** If multiple requests hit the loader after TTL expiry, only one fetch should fire. The others should get the stale cached data. Implementation is straightforward — a module-level `refreshInProgress` flag (or a stored Promise reference):

```js
let refreshPromise = null;

async function refreshIfNeeded(department) {
  if (refreshPromise) return; // already in flight
  refreshPromise = fetchManifest(department)
    .then(updateCaches)
    .finally(() => { refreshPromise = null; });
}
```

This prevents fetch storms. Since Cloud Functions are single-threaded per instance, true concurrency isn't a concern — but async overlap is, and this handles it.

**Retry backoff: one retry with a 5-second delay, then wait for next TTL cycle.** Our update cadence is a few times per semester. If GitHub Pages is briefly down, the next TTL expiry (1 hour later) will try again. Aggressive retry logic adds complexity for a scenario where waiting is fine. One immediate retry on failure, then give up until the next TTL window.

#### 4. Unknown-version policy: warn + fallback, developer owns coordination

**Policy: `warn` + `fallback`.** If Sandra encounters a manifest with an unrecognized `manifestVersion` (e.g., `"2.0"` when she only understands `"1.0"`):

1. **Log a warning** — `"Unknown manifest version 2.0 for English; falling back to cached/static data"`
2. **Fall back** — same chain as answer #1 (Firestore cache → program-data files)
3. **Do not attempt to parse** — a newer schema version may have breaking structural changes

**Who owns version bumps:** The developer (currently one person) coordinates across all three repos. The process:

1. Update the schema in `tcu-english-advising` with the new version
2. Update the manifest generators in both wizard repos to produce the new version
3. Update Sandra's `manifest-to-context.js` to understand the new version
4. Deploy Sandra first (she should understand both old and new versions during the transition), then deploy the wizards

This is a manual, low-frequency coordination task — the schema will change maybe once a year. At 2-3 repos and one developer, a formal versioning protocol would be over-engineering.

#### 5. Launch observability — lightweight structured logging

For launch, **structured `console.log`/`console.warn` via Firebase Cloud Functions logging** is sufficient. No external monitoring services needed. Log these events:

| Event | Level | Fields |
|---|---|---|
| Manifest fetched successfully | `info` | `department`, `manifestVersion`, `lastUpdated`, `fetchDurationMs` |
| Manifest fetch failed | `warn` | `department`, `manifestUrl`, `error`, `fallbackSource` (`firestore` / `program-data`) |
| Schema validation failed | `warn` | `department`, `validationErrors[]`, `fallbackSource` |
| Serving from Firestore fallback | `info` | `department`, `cachedAge` (time since `lastUpdated`) |
| Serving from static fallback | `warn` | `department` (means no Firestore cache exists either) |
| TTL refresh triggered | `info` | `department`, `staleDurationMs` |

These are queryable in the Firebase Console / Cloud Logging with zero additional infrastructure. If a manifest is consistently failing, the `warn`-level logs will surface in the Firebase dashboard.

**Not needed at launch:** metrics dashboards, alerting, uptime monitoring. The update cadence is low and the fallback chain ensures Sandra never breaks. If we notice repeated warnings in the logs, we investigate. That's proportionate to the scale.

---

### Codex Findings on Follow-up Responses

#### High: Single-flight should be per-department, not global

**Agreed — this is a bug in the pseudocode.** A single global `refreshPromise` means if English is mid-refresh and DCDA's TTL expires, DCDA's refresh gets silently skipped. The fix is a `Map` keyed by department:

```js
const refreshPromises = new Map();

async function refreshIfNeeded(department) {
  if (refreshPromises.has(department)) return; // this department already in flight
  const promise = fetchManifest(department)
    .then(manifest => updateCaches(department, manifest))
    .finally(() => { refreshPromises.delete(department); });
  refreshPromises.set(department, promise);
}
```

Each department refreshes independently. The pseudocode in answer #3 above should be treated as superseded by this version.

#### Medium: Concurrency assumption — design for concurrent requests

**Agreed — the original phrasing was too dismissive.** While a single Cloud Functions instance is single-threaded, multiple async requests can interleave within one instance, and multiple instances can run simultaneously under load. The loader should be designed as if concurrent requests are normal:

- **Within one instance:** The per-department `Map` approach handles async overlap correctly — concurrent requests for the same department share one in-flight fetch, concurrent requests for different departments proceed independently.
- **Across instances:** Each instance maintains its own in-memory cache and refresh state. This means two instances might both fetch the same manifest after TTL expiry — that's acceptable. The fetches are idempotent reads from static hosting, and the Firestore write is a simple document set (last-write-wins, all writing the same data). No coordination needed across instances.

The key design principle: **assume concurrent requests, but don't add cross-instance coordination.** The operations are naturally idempotent, so duplicate work is harmless.

#### Medium: Schema drift — add a version pin check in CI

**Agreed that manual copy is the weak link.** Adding a CI check is low-effort and catches drift before it matters. Each wizard repo's CI should:

1. Read `manifestVersion` from its own `schemas/manifest.schema.json`
2. Fetch the schema from the source-of-truth repo (raw GitHub URL from `tcu-english-advising`)
3. Compare versions — fail the build if they don't match

This is a single `curl` + `jq` step in a GitHub Action. It doesn't prevent all drift (the schema content could diverge even at the same version), but it catches the most common failure: someone updates the source schema and forgets to propagate. For Phase 1-2 with 2 repos, this is proportionate. Full content-hash comparison can come later if needed.

#### Low: Add a minimal log-based alert

**Fair point.** Firebase Cloud Logging supports log-based alerting natively. Add one alert at launch:

- **Trigger:** More than 5 `warn`-level log entries matching `"Manifest fetch failed"` or `"Schema validation failed"` within a 1-hour window
- **Action:** Email notification to the developer

This catches sustained failures (hosting down, broken deploy) without generating noise for transient blips. It's a single configuration in the Firebase Console, no code needed. Adding this to the action items.

---

### Updated Action Items

- [ ] Update Phase 1 generator path to `scripts/generate-manifest.js`
- [ ] Add `manifest.schema.json` to Phase 1 deliverables
- [ ] Design `manifest-loader.js` (Phase 3) with stale-while-revalidate pattern from the start
- [ ] Use per-department `Map` for single-flight refresh (not a global promise)
- [ ] Design loader assuming concurrent requests are normal (async overlap + multi-instance)
- [ ] Use Firestore for durable manifest cache in Phase 3
- [ ] Revise the Risks table to reflect actual backend failure modes
- [ ] Remove CORS from the risk table
- [ ] Add CI schema version pin check in wizard repos
- [ ] Configure a log-based alert for sustained manifest fetch/validation failures
