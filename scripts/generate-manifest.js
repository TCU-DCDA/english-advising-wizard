#!/usr/bin/env node

/**
 * Manifest Generator for TCU English Department Wizard
 *
 * Reads program + course data from Firestore (english_config/*) with static
 * JSON fallback, fetches upcoming offerings, and emits public/manifest.json
 * validated against schemas/manifest.schema.json.
 *
 * Part of the AddRan Advising Ecosystem integration (Phase 3c).
 *
 * Requires Application Default Credentials for local runs:
 *   gcloud auth application-default login
 *
 * CI contract: when CI=true and a committed public/manifest.json exists, a
 * Firestore fetch failure is logged and the generator exits 0, letting CI
 * deploy the committed manifest as-is.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const DATA_DIR = join(projectRoot, 'src', 'data');
const SCHEMA_PATH = join(projectRoot, 'schemas', 'manifest.schema.json');
const OUTPUT_PATH = join(projectRoot, 'public', 'manifest.json');

initializeApp({
  credential: applicationDefault(),
  projectId: 'dcda-advisor-mobile',
});
const db = getFirestore();

function loadJSON(filename) {
  const path = join(DATA_DIR, filename);
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    process.exit(1);
  }
}

/**
 * Fetch english_config/offerings_* docs whose term has not yet started.
 * Doc ID is the source of truth for which term a doc represents; the doc's
 * `term` field is ignored because it's user-editable and has drifted in the
 * past (same gotcha DCDA hit — see offerings_sp26 corruption history).
 *
 * Approximate TCU term start dates: sp → Jan 15, su → May 20, fa → Aug 20.
 */
async function fetchUpcomingOfferings() {
  const SEASON_ORDER = { sp: 0, su: 1, fa: 2 };
  const SEASON_LABEL = { sp: 'Spring', su: 'Summer', fa: 'Fall' };

  function termStartDate(season, yy) {
    const year = 2000 + yy;
    if (season === 'sp') return new Date(year, 0, 15);
    if (season === 'su') return new Date(year, 4, 20);
    if (season === 'fa') return new Date(year, 7, 20);
    return null;
  }

  const snap = await db.collection('english_config').get();
  const now = new Date();
  const terms = [];

  snap.forEach(doc => {
    const match = doc.id.match(/^offerings_(sp|su|fa)(\d{2})$/);
    if (!match) return;
    const season = match[1];
    const yy = parseInt(match[2], 10);
    const startDate = termStartDate(season, yy);
    if (!startDate || startDate < now) return;
    terms.push({
      docId: doc.id,
      sortKey: yy * 10 + SEASON_ORDER[season],
      label: `${SEASON_LABEL[season]} 20${yy}`,
      data: doc.data(),
    });
  });

  terms.sort((a, b) => a.sortKey - b.sortKey);
  return terms;
}

async function fetchDoc(docId) {
  const snap = await db.doc(`english_config/${docId}`).get();
  return snap.exists ? snap.data() : null;
}

// TCU codes: 10000-20000 = lower, 30000+ = upper
function parseLevel(code) {
  const match = code.match(/(\d{5})/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num < 30000 ? 'lower' : 'upper';
  }
  return undefined;
}

console.log('TCU English Department - Manifest Generator\n');

console.log('Fetching upcoming offerings from Firestore...');
let upcomingOfferings;
let firestorePrograms;
let firestoreCoursesDoc;
try {
  [upcomingOfferings, firestorePrograms, firestoreCoursesDoc] = await Promise.all([
    fetchUpcomingOfferings(),
    fetchDoc('programs'),
    fetchDoc('courses'),
  ]);
} catch (err) {
  // CI fallback — see file header for the build contract.
  if (process.env.CI === 'true' && existsSync(OUTPUT_PATH)) {
    console.warn('\nWARNING: Firestore unreachable — using committed manifest as-is.');
    console.warn(`  Reason: ${err.message}`);
    console.warn(`  Manifest: ${OUTPUT_PATH}`);
    console.warn('  Regenerate and commit locally before pushing content changes.\n');
    process.exit(0);
  }

  console.error('\nFailed to read english_config from Firestore:');
  console.error(`  ${err.message}`);
  console.error('\nThis script requires Application Default Credentials.');
  console.error('Run: gcloud auth application-default login');
  console.error('Then rerun: npm run generate-manifest\n');
  process.exit(1);
}

if (upcomingOfferings.length === 0) {
  console.warn('Warning: no upcoming offerings found in english_config');
} else {
  console.log(`Fetched ${upcomingOfferings.length} upcoming term(s): ${upcomingOfferings.map(t => t.label).join(', ')}`);
}

// Programs: Firestore with static fallback
let programs = firestorePrograms;
if (!programs) {
  console.warn('  english_config/programs missing — falling back to src/data/programs.json');
  programs = loadJSON('programs.json');
} else {
  console.log('  english_config/programs loaded from Firestore');
}

// Course catalog: Firestore (wrapped as {courses: [...]}) with static ESM fallback
let catalogCourses;
if (firestoreCoursesDoc?.courses) {
  catalogCourses = firestoreCoursesDoc.courses;
  console.log(`  english_config/courses loaded from Firestore (${catalogCourses.length} courses)`);
} else {
  console.warn('  english_config/courses missing — falling back to src/allCourses.js');
  const mod = await import(join(projectRoot, 'src', 'allCourses.js'));
  catalogCourses = mod.ALL_COURSES;
}

// Remaining static-only data.
// Note: prerequisites.json is intentionally NOT loaded — Sandra's converter
// ignores the prerequisites field, and English's nested-array {require: [[...]]}
// shape violates Firestore's no-arrays-of-arrays rule, causing Sandra's
// manifest-cache write to fail after successful validation. The wizard's own
// client code still imports prerequisites.json directly for its prereq-check UI.
const fourYearPlans = loadJSON('four-year-plans.json');
const contacts = loadJSON('contacts.json');
const careerOptions = loadJSON('career-options.json');

console.log('Loaded all data files');

function transformRequirements(programData) {
  const categories = [];

  Object.entries(programData.requirements).forEach(([categoryId, categoryData]) => {
    categories.push({
      id: categoryId,
      name: categoryData.name,
      hours: categoryData.hours,
      courses: categoryData.courses,
      ...(categoryData.note && { note: categoryData.note }),
    });
  });

  const result = { categories };

  if (programData.overlays) {
    result.overlays = Object.entries(programData.overlays).map(([overlayId, overlayData]) => ({
      id: overlayId,
      name: overlayData.name,
      hours: overlayData.hours,
      courses: overlayData.courses,
    }));
  }

  if (programData.maxLowerDivision !== undefined) {
    result.maxLowerDivision = programData.maxLowerDivision;
  }

  return result;
}

// Build highlightedCourses array once — same value for all programs, matching DCDA pattern
const highlightedByTerm = upcomingOfferings
  .filter(t => (t.data.sections || []).length > 0)
  .map(t => ({
    term: t.label,
    courses: t.data.sections.map(s => {
      const course = {
        code: s.code,
        title: s.title,
        hours: 3, // TCU English courses are uniformly 3 hours
      };
      if (s.schedule) course.schedule = s.schedule.replace(/\n/g, ' ');
      if (s.modality) course.modality = s.modality;
      // status and enrollment intentionally omitted — point-in-time snapshots
      return course;
    }),
  }));

function generateManifest() {
  const manifest = {
    manifestVersion: '1.0',
    department: 'English',
    lastUpdated: new Date().toISOString(),
    wizardUrl: 'https://english.digitcu.org/',
    programs: [],
  };

  const programConfigs = [
    {
      key: 'english',
      id: 'english-ba',
      abbreviation: 'ENGL',
      degree: 'BA',
      url: 'https://addran.tcu.edu/english/academics/undergraduate/major.php',
    },
    {
      key: 'writing',
      id: 'writing-rhetoric-ba',
      abbreviation: 'WRIT',
      degree: 'BA',
      url: 'https://addran.tcu.edu/english/academics/undergraduate/major-writing.php',
    },
    {
      key: 'creativeWriting',
      id: 'creative-writing-ba',
      abbreviation: 'CRWT',
      degree: 'BA',
      url: 'https://addran.tcu.edu/english/academics/undergraduate/major-creative.php',
    },
  ];

  programConfigs.forEach(config => {
    const programData = programs[config.key];

    if (!programData) {
      console.warn(`Warning: No data found for program '${config.key}'`);
      return;
    }

    const program = {
      id: config.id,
      name: programData.name,
      abbreviation: config.abbreviation,
      degree: config.degree,
      totalHours: programData.totalHours,
      url: config.url,
      descriptions: [programData.description],
      careerOptions: careerOptions[config.key] || [],
      contacts,
      requirements: transformRequirements(programData),
    };

    if (programData.maxLowerDivision !== undefined) {
      program.maxLowerDivision = programData.maxLowerDivision;
    }

    if (programData.note) {
      program.note = programData.note;
    }

    if (config.key === 'writing' || config.key === 'creativeWriting') {
      program.internship = {
        description: 'WRIT 40273 - Writing Internship. Gain real-world experience in professional or creative writing contexts.',
        courses: [
          { code: 'WRIT 40273', title: 'Writing Internship', hours: 3 },
        ],
      };
    }

    if (fourYearPlans[config.key]) {
      program.fourYearPlan = fourYearPlans[config.key];
    }

    if (highlightedByTerm.length > 0) {
      program.highlightedCourses = highlightedByTerm;
    }

    manifest.programs.push(program);
  });

  // Department-wide course catalog
  manifest.courseCatalog = catalogCourses.map(c => ({
    code: c.code,
    title: c.title,
    hours: c.hours ?? 3,
    ...(parseLevel(c.code) && { level: parseLevel(c.code) }),
    ...(c.description && { description: c.description }),
  }));

  manifest.advisingNotes = [
    'Most 30000+ level ENGL courses require: ENGL 10803, ENGL 20803, and at least one 10000- or 20000-level ENGL/WRIT/CRWT course',
    'Students who declared Fall 2025 may count 12 lower-division hours for Writing & Rhetoric (normally 9 hours)',
    'Only 3 lower-division hours count toward Creative Writing major',
    'No more than 9 hours of lower-division courses total count toward English major',
    `Upcoming term offerings: ${upcomingOfferings.map(t => `${t.label} (${(t.data.offeredCodes || []).length} courses)`).join('; ') || 'none on file'}`,
  ];

  return manifest;
}

const manifest = generateManifest();

console.log(`Generated manifest with ${manifest.programs.length} programs`);

console.log('\nValidating manifest against schema...');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(manifest);

if (!valid) {
  console.error('Manifest validation failed:\n');
  validate.errors.forEach(error => {
    console.error(`  - ${error.instancePath || '(root)'}: ${error.message}`);
    if (error.params) {
      console.error(`    ${JSON.stringify(error.params)}`);
    }
  });
  console.error('\nFix the errors above and try again.');
  process.exit(1);
}

console.log('Manifest validation passed');

try {
  mkdirSync(join(projectRoot, 'public'), { recursive: true });
} catch {
  // exists
}

try {
  writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nManifest written to: ${OUTPUT_PATH}`);

  console.log('\nManifest Summary:');
  console.log(`  Version: ${manifest.manifestVersion}`);
  console.log(`  Department: ${manifest.department}`);
  console.log(`  Programs: ${manifest.programs.length}`);
  manifest.programs.forEach(p => {
    console.log(`    - ${p.name} (${p.degree})`);
  });
  console.log(`  Course Catalog: ${manifest.courseCatalog.length} courses`);
  console.log(`  Highlighted Terms: ${highlightedByTerm.length}`);
  console.log(`  Last Updated: ${manifest.lastUpdated}`);
  console.log('\nManifest generation complete!\n');
} catch (error) {
  console.error('Error writing manifest:', error.message);
  process.exit(1);
}
