# AddRan Advising Integration Plan: Chatbot + Department Wizards

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
1. Create `src/manifest-generator.js` — a build-time script that reads `COURSE_DATA`, `PREREQUISITES`, `FOUR_YEAR_PLANS`, and contact info from `App.jsx` (or extracted data files) and writes `public/manifest.json`
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
| Manifest fetch fails on cold start | Cache last-known-good manifest locally; fall back to existing program-data/*.json files |
| Manifest schema drift across departments | Version field (`manifestVersion: "1.0"`) + validation on load; reject/warn on unknown versions |
| Context window bloat as more wizards join | Selective context: only include detailed data for programs mentioned in the conversation (Sandra already does this pattern with `detectProgramMentions`) |
| Department publishes invalid data | Schema validation in manifest loader; log warnings but don't crash — use fallback data |
| CORS blocks manifest fetch from Cloud Functions | GitHub Pages and Firebase Hosting both serve with permissive CORS; add explicit CORS headers to manifest if needed |

---

## Phase 1 Scope (This PR)

For this branch (`claude/chatbot-wizard-integration-fRndX`), the deliverable is:

1. **Extract** `COURSE_DATA`, `PREREQUISITES`, and `FOUR_YEAR_PLANS` from `App.jsx` into standalone data files under `src/data/`
2. **Create** `scripts/generate-manifest.js` that produces a `manifest.json` following the schema above
3. **Update** the build pipeline to generate the manifest before building
4. **Add** the manifest schema documentation
5. **Verify** the React app still works identically after the data extraction

This establishes the pattern. Phases 2-5 follow in their respective repos.
