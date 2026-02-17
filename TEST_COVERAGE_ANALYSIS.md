# Test Coverage Analysis

Date: 2026-02-17
Status: Initial analysis

## Current State

The project has **zero tests**. There are no test files, no test framework installed, no test configuration, and no test step in the CI pipeline. The `INTEGRATION_EXECUTION_PLAN.md` baseline checklist (item #15) explicitly marks this as **N** (missing) for the English wizard.

### What's missing

- No test runner (Vitest, Jest, etc.)
- No testing libraries (React Testing Library, etc.)
- No test configuration files
- No `test` script in `package.json`
- No test step in `.github/workflows/deploy.yml`
- No coverage tool or reporting

## Recommended Test Framework

**Vitest + React Testing Library** is the natural fit since the project already uses Vite. Vitest provides native ESM support, fast execution, and zero-config compatibility with the existing Vite setup. jsdom provides the DOM environment needed for React component tests.

Required new dev dependencies:
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

## Testable Areas by Priority

### Priority 1: Business Logic (Critical)

These are pure computational functions that produce incorrect results silently if broken. They directly affect academic advising accuracy.

#### 1.1 Degree progress calculation (`App.jsx:807-839`)

The `totalCompleted` useMemo in `RequirementsChecklist` computes how many hours a student has completed toward their major. It contains two code paths: one for normal categories (sum hours of completed courses) and one for elective categories (sum hours of completed courses *not* in other categories, excluding TCU Core).

**Why it matters:** An incorrect total means students could think they're further along (or behind) than they actually are. The elective path is especially error-prone because it cross-references all other categories.

**Suggested tests:**
- Zero completed courses returns 0 hours
- Completing courses in a single category sums correctly
- Hours are capped at category maximum (a category requiring 6 hours doesn't count 9 even if 3 courses are completed)
- Elective hours exclude courses already counted in other categories
- TCU Core courses (`ENGL 10803`, `ENGL 20803`) are excluded from elective totals
- Switching majors recalculates correctly (different requirement structures)

#### 1.2 Lower-division hour enforcement (`App.jsx:879-901`)

The `lowerDivisionHours` useMemo extracts the 5-digit course number, classifies courses in the 10000-29999 range as lower-division, and sums their hours. This feeds the warning system that prevents students from exceeding their major's lower-division cap (9 hours for English, 3 for Creative Writing, 12 for Writing & Rhetoric).

**Why it matters:** Each major has different caps. A miscalculation could let students plan a schedule that doesn't count toward their degree.

**Suggested tests:**
- Course number extraction regex handles all known formats (e.g., `ENGL 10803`, `CRWT 20103`)
- Courses numbered 10000-29999 are classified as lower-division
- Courses numbered 30000+ are not lower-division
- TCU Core courses are excluded from the count
- Each major's `maxLowerDivision` threshold produces correct status (`ok`, `warning`, `over`)
- Completed, planned, and future courses are all included in the calculation

#### 1.3 Prerequisite validation (`App.jsx:1652-1797`)

The `toggleCourse` function enforces prerequisite checks when adding courses. It has three distinct step modes (completed, planned, future), each with different validation rules. The ENGL 20803 credit-hour gate (requires 30 total hours) is a special case.

**Why it matters:** A broken prerequisite check either blocks valid course selections or allows invalid ones, both of which lead to incorrect advising.

**Suggested tests:**
- Step 1: Adding a course with prerequisites when none are completed shows alert
- Step 1: Adding a course with prerequisites when at least one is completed succeeds
- Step 1: ENGL 20803 is blocked when total credit hours < 30
- Step 1: ENGL 20803 is allowed when total credit hours >= 30
- Step 2: Already-completed courses cannot be toggled
- Step 2: Prerequisites can be satisfied by planned courses (not just completed)
- Step 3: Completed and planned courses cannot be assigned to future semesters
- Removing a completed course also removes it from planned and future

#### 1.4 Elective category detection and counting (`App.jsx:616-681`)

The `RequirementCategory` component has special handling for elective categories (detected by the presence of a course with `code === 'ANY'`). It builds an exclusion set from all non-elective categories, then counts only courses outside that set.

**Why it matters:** This is the most complex counting logic in the app. A bug here means elective hours are misreported while other categories appear correct.

**Suggested tests:**
- Categories containing a course with code `ANY` are detected as elective categories
- Normal categories are not detected as elective
- Elective count excludes courses that appear in any non-elective category
- Elective count excludes TCU Core courses
- The `coursesToDisplay` list for electives shows only courses not in other categories

### Priority 2: Manifest Generation (High)

The manifest generator (`scripts/generate-manifest.js`) is a build-time Node.js script that transforms source data into the ecosystem manifest format. Errors here propagate to Sandra (the chatbot consumer).

#### 2.1 Data transformation correctness

**Suggested tests:**
- `transformRequirements` produces the correct structure for each major (categories array, optional overlays, maxLowerDivision)
- All 3 program configs map to the correct IDs (`english-ba`, `writing-rhetoric-ba`, `creative-writing-ba`)
- Internship data is attached only to Writing & Rhetoric and Creative Writing programs
- Prerequisites are included in every program entry
- Four-year plans are attached when available
- Career options are mapped to the correct major key
- `manifestVersion` is set to `"1.0"`
- `lastUpdated` is a valid ISO 8601 timestamp

#### 2.2 Schema validation

**Suggested tests:**
- The generated manifest passes AJV validation against `schemas/manifest.schema.json`
- A manifest with a missing required field fails validation
- A manifest with an invalid `manifestVersion` fails validation
- The schema correctly rejects malformed course objects (missing code, title, or hours)

### Priority 3: Data Integrity (High)

These tests validate that the static JSON data files are internally consistent. They catch copy-paste errors, typos in course codes, and mismatches between files.

#### 3.1 `programs.json` consistency

**Suggested tests:**
- Every course code in requirements matches a course in `allCourses.js` (except `ANY` placeholder codes and wildcard codes like `ENGL 30XX`)
- No duplicate course codes within a single category
- All `hours` fields are positive integers
- `totalHours` equals the sum of all category `hours` for each major
- Every course with `level: "lower"` has a course number in the 10000-29999 range
- Every major has at least one requirement category

#### 3.2 `prerequisites.json` consistency

**Suggested tests:**
- Every course listed as a prerequisite exists in `allCourses.js`
- Every course that *has* prerequisites exists in at least one major's requirements
- No circular prerequisite chains exist
- Empty prerequisite arrays (like `WRIT 30390: []`) are valid

#### 3.3 `four-year-plans.json` structure

**Suggested tests:**
- Every major has all 4 years with both `fall` and `spring` semesters
- Every course entry has `code`, `title`, and `hours`
- Total planned hours across all semesters approximate `totalHours` for the major

### Priority 4: Component Rendering (Medium)

These tests verify that UI components render correctly given valid props. They protect against regressions when refactoring the monolithic `App.jsx`.

#### 4.1 `ProgressRing`

**Suggested tests:**
- Renders with 0% progress
- Renders with 100% progress
- Renders with an intermediate value (e.g., 45%)
- SVG calculations produce valid `strokeDashoffset` values

#### 4.2 `CatalogList`

**Suggested tests:**
- Courses are grouped into WCO, ENGL, CRWT, WRIT buckets
- `ENGL 10803` and `ENGL 20803` appear in the WCO group, not ENGL
- Search filters courses by code, title, and description
- Empty search shows all courses
- Completed courses show a checked state

#### 4.3 `RequirementCategory`

**Suggested tests:**
- Collapsed state shows category name and hour summary
- Expanded state shows course list
- Completed category shows green styling
- Step 1 shows green checkboxes; step 2 shows blue checkboxes
- Disabled state applied to already-completed courses in step 2

#### 4.4 `FourYearPlan`

**Suggested tests:**
- Renders all 4 years with fall and spring columns
- Course cards show code, title, hours, and optional category/note
- Switching majors updates the displayed plan

#### 4.5 `PrerequisiteMap`

**Suggested tests:**
- Creative Writing and English majors show CRWT workshop chains
- Writing & Rhetoric major shows professional writing chains
- Chain arrows render between consecutive courses

### Priority 5: Integration / E2E Flows (Lower)

These verify multi-step workflows end-to-end.

#### 5.1 Course selection 3-step flow

**Suggested tests:**
- Step 1: Checking a course marks it completed across all views
- Step 2: Checking a course marks it as planned (blue) without changing completed status
- Step 3: Assigning a course to a future semester doesn't affect completed/planned state
- Switching steps preserves all selections

#### 5.2 Major switching

**Suggested tests:**
- Selecting a different major updates requirements display
- Course selections persist across major switches (they're not major-specific)

#### 5.3 `generatePDFReport`

**Suggested tests:**
- Produces valid HTML string containing the student's progress data
- Category progress calculations match the main app calculations
- Future semester plan sorting (Spring before Fall within same year)
- Empty state (no completed courses) produces a valid report

#### 5.4 `generateSemesterOptions`

**Suggested tests:**
- Returns options for 7 years (current year + 6)
- Each year has Spring and Fall entries
- Format is `"Spring YYYY"` / `"Fall YYYY"`

## Recommended Implementation Order

To extract the business logic for testing, some functions should be refactored out of the React components into standalone utility modules. This provides testable units without requiring a full component architecture rewrite.

### Step 1: Extract and test pure logic

Create `src/utils/degree-logic.js` (or similar) containing:
- `calculateCategoryHours(category, completedCourses, allRequirements, allCourses)`
- `calculateLowerDivisionHours(selectedCourses, allCourses, coreExclusions)`
- `checkPrerequisites(courseCode, completedCourses, prerequisites)`
- `isElectiveCategory(category)`
- `generateSemesterOptions()`

These can be tested with plain unit tests — no DOM, no React.

### Step 2: Test the manifest generator

The generator is already a standalone Node.js script. Write tests that:
- Import its transformation functions (may require minor refactoring to export them)
- Validate output against the schema
- Check each program's structure

### Step 3: Test data file integrity

Write tests that load the JSON data files and validate:
- Cross-referencing between files (prerequisites reference real courses, plans reference real courses)
- Internal consistency (no duplicates, required fields present, hours are positive)

### Step 4: Test React components

Using React Testing Library:
- Render individual components with controlled props
- Verify correct output and interaction behavior
- Mock data dependencies as needed

### Step 5: Add CI integration

Update `.github/workflows/deploy.yml` to run `npm test` before the build step. Tests should block deployment on failure.

## Summary

| Priority | Area | Files | Risk if Untested |
|----------|------|-------|-----------------|
| 1 | Degree progress & prerequisite logic | `App.jsx` (logic extraction needed) | Students get wrong advising data |
| 2 | Manifest generation | `scripts/generate-manifest.js` | Sandra chatbot ingests bad data |
| 3 | Data integrity | `src/data/*.json`, `src/allCourses.js` | Silent data errors across the system |
| 4 | Component rendering | `App.jsx` (all components) | UI regressions on refactoring |
| 5 | E2E workflows | Full app | Multi-step flows break silently |

The single highest-impact improvement is extracting the business logic from React components into testable utility functions and writing unit tests for degree progress calculation, lower-division enforcement, and prerequisite validation. These are the core advising calculations that students rely on.
