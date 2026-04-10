# Sandra Integration — English Wizard (Engelina)

Status as of 2026-04-10. This doc lives in the English wizard repo so future changes to Engelina's manifest pipeline have context.

## What this wizard contributes to the ecosystem

The English wizard publishes a manifest at `https://english.digitcu.org/manifest.json` that Sandra (the AddRan chatbot at `addran-advisor-9125e`) fetches live with a 1-hour TTL and stale-while-revalidate. Sandra uses it to answer student questions about English programs, requirements, contacts, and (after the work in "Next steps" below) individual courses.

- Generator: [scripts/generate-manifest.js](../scripts/generate-manifest.js)
- Schema: [schemas/manifest.schema.json](../schemas/manifest.schema.json)
- Output: `public/manifest.json` (tracked in git as a build artifact)

The ecosystem is hub-and-spoke: wizards are producers, Sandra is the single consumer. Content changes flow wizard → manifest → Sandra, no Sandra redeploy required in the happy path.

## Current state

The wizard emits a valid schema v1.0 manifest with programs, requirements, contacts, and `highlightedCourses` data, and Sandra successfully fetches and renders it. But as of 2026-04-10 the manifest does **not** emit a `courseCatalog` section, so Sandra cannot answer course-level questions about English (e.g., "what is ENGL 30653 about?" — she'll hedge or say she doesn't have the detail).

Verify with:

```sh
curl -s https://english.digitcu.org/manifest.json | jq '.courseCatalog | length'
```

If that returns `0` or `null`, the catalog work described below hasn't landed yet.

## Context — what DCDA did first

The DCDA wizard went through the same integration cleanup earlier on 2026-04-10. The work there is the reference implementation for what English should do. DCDA-side commits in `dcda-advising-wizard`:

| Commit | Scope |
|---|---|
| `f448024` | Generator reads offerings from Firestore (not static JSON) via firebase-admin + ADC |
| `13fda8f` | CI fallback: when Firestore is unreachable in CI and a committed manifest exists, use the committed file instead of failing the build |

And in `advisor-chat`:

| Commit | Scope |
|---|---|
| `f1e0a13` | Surface full `courseCatalog` section with descriptions; stop truncating category course lists at 6 |
| `9e30144` | Prompt: `COUNTING COURSES` rule + remove stale "data may be outdated" instruction |
| `91ecdbe` | Handle `highlightedCourses` as array of term objects (oneOf in schema; converter handles both shapes) |
| `0452f2c` | ROADMAP update |

**Sandra is already ready for English's catalog.** The converter in `advisor-chat/functions/manifest-to-context.js` already emits a "Course Catalog" section when the manifest includes one. No advisor-chat code changes are needed for the catalog work — only the English wizard has to start emitting it.

## Next steps for English

### 1. Architecture triage — Firestore or static JSON?

DCDA was the outlier: it has an Admin UI that edits Firestore and was silently drifting from its static files. Before migrating English to the same Firestore pattern, find out if it needs it:

```sh
grep -r "useFirestoreDoc\|getFirestore\|doc(db," src/
```

If that returns nothing, English is pure static JSON and **does not need the Firestore migration** — just the catalog emitter (step 3). If there are Firestore reads in the app, look at where they write from (probably an admin UI) and consider whether the same drift bug applies.

Also check: `firebase-admin` is NOT currently in `package.json`. If you decide to migrate to Firestore, `npm install -D firebase-admin` first.

### 2. Triage the offerings files

`src/data/` currently has five offerings files (as of 2026-04-10):

```
offerings-fa25.json
offerings-fa26.json
offerings-fa26-2026-03-09.json   ← timestamped duplicate, likely cruft
offerings-sp26.json
offerings-wi26.json
```

Before adding a catalog emitter, figure out which files are actually read by the current generator and retire the rest. The timestamped `fa26-2026-03-09.json` is almost certainly a historical backup that should be deleted or gitignored.

### 3. Add a `courseCatalog` emitter

This is the primary deliverable. Mirror the DCDA shape exactly so Sandra's converter handles it without changes:

```js
manifest.courseCatalog = courses.map(c => ({
  code: c.code,
  title: c.title,
  hours: parseHours(c.code),
  level: parseLevel(c.code),       // 'lower' or 'upper'
  description: c.description,
}));
```

The source data is probably in one of:
- [src/data/allCourses.ts](../src/data/allCourses.ts) — note the `.ts` extension, may need compilation or a separate JSON export
- [src/data/courses-import.json](../src/data/courses-import.json)

Determine which is authoritative before wiring it up.

The existing English schema at `schemas/manifest.schema.json` should already allow `courseCatalog` because it was defined as optional when the schema was first written. Confirm by regenerating and running the AJV validation step — if validation fails, update the schema.

### 4. (Optional) multi-term `highlightedCourses`

DCDA's `highlightedCourses` is now an array of `{term, courses}` objects, one per upcoming term. Sandra's converter handles both the legacy single-object shape and the current array shape transparently, so this is a choice, not a requirement.

If English has summer and fall offerings worth surfacing at the same time, adopt the array shape. If only one term matters, stick with the existing single-object output. Either way, Sandra will handle it.

### 5. Regenerate, verify, deploy

```sh
cd english-advising-wizard
npm run generate-manifest
jq '.courseCatalog | length' public/manifest.json    # should be > 0
jq '.courseCatalog[0]' public/manifest.json           # spot-check shape
npm run build
firebase deploy --only hosting    # check .firebaserc for the project ID
```

Commit the regenerated manifest along with the generator change — like DCDA, the committed `public/manifest.json` is treated as a build artifact.

### 6. Verify via Engelina chat

Open https://english.digitcu.org, ask a course-level question about a specific English course:

> "What is ENGL 30653 about?"

Expected: Sandra names the course accurately and summarizes it from the manifest's description field. Failure mode: she hedges or says she doesn't have course-level detail — meaning the catalog didn't make it into her context.

### 7. Confirm Sandra fetched it

From any machine with Firebase CLI access:

```sh
firebase functions:log --project addran-advisor-9125e --only api -n 50 | grep -E "manifest_fetch.*English"
```

Look for a fresh `manifest_fetch_success` entry with `department: "English"` and the new `lastUpdated` timestamp. Sandra's in-memory cache is 1 hour TTL with SWR, so the next chat request after deploy will fetch the new manifest in the background.

## CI gotcha — carry this if you migrate to Firestore

If you do end up migrating the English generator to Firestore (step 1), you'll hit the same CI break DCDA hit in commit `f448024`: GitHub Actions has no Application Default Credentials, so `npm run build` fails at the `generate-manifest` step. Port the DCDA fix from [dcda-advising-wizard/scripts/generate-manifest.js](../../dcda-advising-wizard/scripts/generate-manifest.js) — look for the `process.env.CI === 'true'` fallback in the Firestore catch block. The contract it implements: the wizard maintainer runs `generate-manifest` locally (with ADC), commits the regenerated `public/manifest.json`, and CI consumes the committed file as-is.

If you don't migrate to Firestore, no CI change needed — the static-file path already works in CI.

## Useful paths

- Sandra converter (reference for what fields get surfaced to Claude): `../../advisor-chat/functions/manifest-to-context.js`
- Sandra schema (validates every fetch): `../../advisor-chat/functions/schemas/manifest.schema.json`
- Sandra wizard registry (maps "English" to the manifest URL): `../../advisor-chat/functions/wizard-registry.json`
- DCDA generator (reference implementation for Firestore + CI fallback): `../../dcda-advising-wizard/scripts/generate-manifest.js`
- DCDA CHANGELOG (documents the Firestore migration contract): `../../dcda-advising-wizard/CHANGELOG.md`
