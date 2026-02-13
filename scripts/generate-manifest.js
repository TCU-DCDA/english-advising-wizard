#!/usr/bin/env node

/**
 * Manifest Generator for TCU English Department Wizard
 *
 * Reads data from src/data/ and generates public/manifest.json
 * Validates output against schemas/manifest.schema.json
 *
 * Part of the AddRan Advising Ecosystem integration (Phase 1)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const DATA_DIR = join(projectRoot, 'src', 'data');
const SCHEMA_PATH = join(projectRoot, 'schemas', 'manifest.schema.json');
const OUTPUT_PATH = join(projectRoot, 'public', 'manifest.json');

// Load data files
function loadJSON(filename) {
  const path = join(DATA_DIR, filename);
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error.message);
    process.exit(1);
  }
}

console.log('📚 TCU English Department - Manifest Generator\n');

const programs = loadJSON('programs.json');
const prerequisites = loadJSON('prerequisites.json');
const fourYearPlans = loadJSON('four-year-plans.json');
const contacts = loadJSON('contacts.json');
const highlights = loadJSON('highlights.json');
const careerOptions = loadJSON('career-options.json');

console.log('✅ Loaded all data files');

// Transform data into manifest format
function generateManifest() {
  const manifest = {
    manifestVersion: "1.0",
    department: "English",
    lastUpdated: new Date().toISOString(),
    wizardUrl: "https://curtrode.github.io/tcu-english-advising/",
    programs: []
  };

  // Helper to transform requirement categories
  function transformRequirements(programKey, programData) {
    const categories = [];

    Object.entries(programData.requirements).forEach(([categoryId, categoryData]) => {
      categories.push({
        id: categoryId,
        name: categoryData.name,
        hours: categoryData.hours,
        courses: categoryData.courses,
        ...(categoryData.note && { note: categoryData.note })
      });
    });

    const result = { categories };

    // Add overlays if they exist
    if (programData.overlays) {
      result.overlays = Object.entries(programData.overlays).map(([overlayId, overlayData]) => ({
        id: overlayId,
        name: overlayData.name,
        hours: overlayData.hours,
        courses: overlayData.courses
      }));
    }

    // Add maxLowerDivision if exists
    if (programData.maxLowerDivision !== undefined) {
      result.maxLowerDivision = programData.maxLowerDivision;
    }

    return result;
  }

  // Generate program entries
  const programConfigs = [
    {
      key: 'english',
      id: 'english-ba',
      abbreviation: 'ENGL',
      degree: 'BA',
      url: 'https://addran.tcu.edu/english/academics/undergraduate/major.php'
    },
    {
      key: 'writing',
      id: 'writing-rhetoric-ba',
      abbreviation: 'WRIT',
      degree: 'BA',
      url: 'https://addran.tcu.edu/english/academics/undergraduate/major-writing.php'
    },
    {
      key: 'creativeWriting',
      id: 'creative-writing-ba',
      abbreviation: 'CRWT',
      degree: 'BA',
      url: 'https://addran.tcu.edu/english/academics/undergraduate/major-creative.php'
    }
  ];

  programConfigs.forEach(config => {
    const programData = programs[config.key];

    if (!programData) {
      console.warn(`⚠️  Warning: No data found for program '${config.key}'`);
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
      contacts: contacts,
      requirements: transformRequirements(config.key, programData)
    };

    // Add optional fields
    if (programData.maxLowerDivision !== undefined) {
      program.maxLowerDivision = programData.maxLowerDivision;
    }

    if (programData.note) {
      program.note = programData.note;
    }

    // Add internship info
    if (config.key === 'writing' || config.key === 'creativeWriting') {
      program.internship = {
        description: "WRIT 40273 - Writing Internship. Gain real-world experience in professional or creative writing contexts.",
        courses: [
          { code: "WRIT 40273", title: "Writing Internship", hours: 3 }
        ]
      };
    }

    // Add prerequisites
    program.prerequisites = prerequisites;

    // Add four-year plan
    if (fourYearPlans[config.key]) {
      program.fourYearPlan = fourYearPlans[config.key];
    }

    // Add highlighted courses (same for all programs)
    program.highlightedCourses = highlights;

    manifest.programs.push(program);
  });

  // Add department-wide advising notes
  manifest.advisingNotes = [
    "Most 30000+ level ENGL courses require: ENGL 10803, ENGL 20803, and at least one 10000- or 20000-level ENGL/WRIT/CRWT course",
    "Students who declared Fall 2025 may count 12 lower-division hours for Writing & Rhetoric (normally 9 hours)",
    "Only 3 lower-division hours count toward Creative Writing major",
    "No more than 9 hours of lower-division courses total count toward English major"
  ];

  return manifest;
}

// Generate the manifest
const manifest = generateManifest();

console.log(`✅ Generated manifest with ${manifest.programs.length} programs`);

// Validate against schema
console.log('\n🔍 Validating manifest against schema...');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(manifest);

if (!valid) {
  console.error('❌ Manifest validation failed:\n');
  validate.errors.forEach(error => {
    console.error(`  • ${error.instancePath || '(root)'}: ${error.message}`);
    if (error.params) {
      console.error(`    ${JSON.stringify(error.params)}`);
    }
  });
  console.error('\n💡 Fix the errors above and try again.');
  process.exit(1);
}

console.log('✅ Manifest validation passed');

// Ensure public directory exists
try {
  mkdirSync(join(projectRoot, 'public'), { recursive: true });
} catch (error) {
  // Directory might already exist, that's fine
}

// Write manifest to public/manifest.json
try {
  writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n✅ Manifest written to: ${OUTPUT_PATH}`);

  // Print summary
  console.log('\n📊 Manifest Summary:');
  console.log(`   Version: ${manifest.manifestVersion}`);
  console.log(`   Department: ${manifest.department}`);
  console.log(`   Programs: ${manifest.programs.length}`);
  manifest.programs.forEach(p => {
    console.log(`     • ${p.name} (${p.degree})`);
  });
  console.log(`   Last Updated: ${manifest.lastUpdated}`);
  console.log('\n✨ Manifest generation complete!\n');
} catch (error) {
  console.error(`❌ Error writing manifest:`, error.message);
  process.exit(1);
}
