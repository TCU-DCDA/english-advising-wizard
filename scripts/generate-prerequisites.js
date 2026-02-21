#!/usr/bin/env node

/**
 * Parse course descriptions from allCourses.js to generate prerequisites.json
 *
 * Uses pattern matching on known prerequisite description formats from the
 * TCU undergraduate catalog. Run once and verify output manually.
 *
 * Usage: node scripts/generate-prerequisites.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Import the course data
const allCoursesPath = join(projectRoot, 'src', 'allCourses.js')
const outputPath = join(projectRoot, 'src', 'data', 'prerequisites.json')

// Read and parse allCourses.js (it's an ES module exporting ALL_COURSES)
const content = readFileSync(allCoursesPath, 'utf-8')
const match = content.match(/export const ALL_COURSES = (\[[\s\S]*\]);?\s*$/)
if (!match) {
  console.error('Could not parse ALL_COURSES from allCourses.js')
  process.exit(1)
}

const courses = JSON.parse(match[1])
console.log(`Loaded ${courses.length} courses from allCourses.js\n`)

// --- Pattern matchers ---

const result = {}
const unmatched = []
let matched = 0

// Normalize cross-listed prefixes: "ENGL/WRIT/CRWT 10203" -> "CRWT 10203"
// Based on canonical codes in the catalog
const CROSS_LISTED = {
  '10203': 'CRWT 10203',
  '20103': 'CRWT 20103',
  '20133': 'CRWT 20133',
  '10803': 'ENGL 10803',
  '10833': 'ENGL 10833',
  '20803': 'ENGL 20803',
  '20833': 'ENGL 20833',
}

function canonicalCode(raw) {
  // "ENGL/WRIT/CRWT 10203" -> "CRWT 10203"
  const m = raw.match(/(?:ENGL|WRIT|CRWT)(?:\/(?:ENGL|WRIT|CRWT))* (\d{5})/)
  if (m && CROSS_LISTED[m[1]]) return CROSS_LISTED[m[1]]
  // "CRWT 30343" -> as-is
  const m2 = raw.match(/((?:ENGL|WRIT|CRWT) \d{5})/)
  if (m2) return m2[1]
  return raw.trim()
}

for (const course of courses) {
  if (!course.description) continue

  // Extract prerequisite text
  const prereqMatch = course.description.match(/^Prerequisites?:\s*(.+?)(?:\.\s+[A-Z]|$)/is)
  if (!prereqMatch) continue

  const prereqText = prereqMatch[1].trim()
  const code = course.code

  // Skip graduate-level courses (55000+)
  const codeNum = parseInt(code.match(/\d{5}/)?.[0] || '0')
  if (codeNum >= 50000) continue

  let entry = null

  // --- Pattern A: Common ENGL 30000+ prereq ---
  // "ENGL 10803, ENGL 20803, and at least one 10000- or 20000-level ENGL/WRIT/CRWT"
  if (/10803.*20803.*(?:at least|one|a least).*(?:10000|20000|10,000|20,000)/i.test(prereqText)) {
    entry = {
      require: [['ENGL 10803'], ['ENGL 20803'], ['@any-lower-div']]
    }
  }

  // --- Pattern A2: "ENGL 10803 and ENGL 20803 and at least one ENGL/WRIT/CRWT" ---
  if (!entry && /10803.*20803.*(?:at least|one).*(?:ENGL|WRIT|CRWT)/i.test(prereqText)) {
    entry = {
      require: [['ENGL 10803'], ['ENGL 20803'], ['@any-lower-div']]
    }
  }

  // --- Pattern A3: with 10833/20833 alternatives ---
  // "ENGL 10803 or 10833, and ENGL 20803 or 20833"
  if (!entry && /10803\s*(?:or|\/)\s*10833.*20803\s*(?:or|\/)\s*20833/i.test(prereqText)) {
    entry = {
      require: [['ENGL 10803', 'ENGL 10833'], ['ENGL 20803', 'ENGL 20833']]
    }
    // Check if there's also "at least one" for lower-div
    if (/(?:at least|one).*(?:10000|20000)/i.test(prereqText)) {
      entry.require.push(['@any-lower-div'])
    }
  }

  // --- Pattern B: CRWT introductory OR ---
  // "ENGL/WRIT/CRWT 10203 or ENGL/WRIT/CRWT 20103 or ENGL/WRIT/CRWT 20133"
  if (!entry && /10203.*20103.*20133/i.test(prereqText)) {
    // Check for additional requirements beyond the intro OR
    const hasWorkshop = /(?:30000|40000|30000-\s*or\s*40000).*(?:workshop|creative writing)/i.test(prereqText)
    const hasGradeReq = /grade\s+of\s+(?:at\s+least\s+)?B-/i.test(prereqText)

    if (hasWorkshop) {
      // Advanced courses needing intro + workshop
      entry = {
        require: [
          ['CRWT 10203', 'CRWT 20103', 'CRWT 20133'],
          ['CRWT 30343', 'CRWT 30353', 'CRWT 30233', 'CRWT 30373', 'CRWT 30363']
        ]
      }
      if (hasGradeReq) {
        entry.note = 'Grade of B- or higher required in workshop'
      }
    } else {
      // Just needs one intro course
      entry = {
        require: [['CRWT 10203', 'CRWT 20103', 'CRWT 20133']]
      }

      // Check for "strongly encouraged" recommendations
      const encouragedMatch = prereqText.match(/strongly encouraged to take (?:ENGL\/WRIT\/CRWT |CRWT )?(\d{5})/i)
      if (encouragedMatch) {
        const recCode = canonicalCode('CRWT ' + encouragedMatch[1])
        entry.recommend = [recCode]
      }
      // "strongly encouraged to take another 30000-level course"
      if (/strongly encouraged.*30000-level/i.test(prereqText) && !encouragedMatch) {
        entry.note = 'Prior 30000-level creative writing course strongly recommended'
      }
    }
  }

  // --- Pattern C: "ENGL 10803 and either ENGL 20803 or WRIT 20113" ---
  if (!entry && /10803.*(?:and|,)\s*(?:either\s+)?(?:ENGL\s+)?20803.*(?:or|,)\s*(?:WRIT\s+)?20113/i.test(prereqText)) {
    entry = {
      require: [['ENGL 10803'], ['ENGL 20803', 'WRIT 20113']]
    }
  }

  // --- Pattern D: "ENGL 10803 and ENGL 20803" (just the two, no lower-div requirement) ---
  if (!entry && /10803\b.*(?:and|,)\s*(?:ENGL\s+)?20803\b/i.test(prereqText) && !/(?:at least|one|additional)/i.test(prereqText)) {
    entry = {
      require: [['ENGL 10803'], ['ENGL 20803']]
    }
    // "and one 20000-level CRWT or WRIT course"
    if (/one\s+20000-level\s+(?:CRWT|WRIT)/i.test(prereqText)) {
      entry.require.push(['@any-lower-div'])
    }
  }

  // --- Pattern E: Single course prerequisite ---
  if (!entry && /^(?:ENGL|WRIT|CRWT)\s+\d{5}\s*$/i.test(prereqText.replace(/\s*\.?\s*$/, ''))) {
    const singleCode = canonicalCode(prereqText.replace(/\s*\.?\s*$/, ''))
    entry = { require: [[singleCode]] }
  }
  // Also handle "ENGL 20803" when it appears at start with extra text after
  if (!entry && /^(ENGL|WRIT|CRWT)\s+(\d{5})\b/.test(prereqText) && !/(?:or|and|,)/i.test(prereqText.substring(0, 20))) {
    const singleMatch = prereqText.match(/^((?:ENGL|WRIT|CRWT)\s+\d{5})/)
    if (singleMatch) {
      entry = { require: [[canonicalCode(singleMatch[1])]] }
      // Check for standing requirements
      if (/sophomore standing/i.test(prereqText)) {
        entry.note = 'Sophomore standing (24 hours) required'
      }
    }
  }

  // --- Pattern F: Standing/major-only requirements ---
  if (!entry && /(?:majors?|minors?)\s+only/i.test(prereqText)) {
    entry = { note: prereqText.replace(/\s+/g, ' ').trim() }
  }

  // --- Pattern G: GPA/credit hour requirements ---
  if (!entry && /credit hours|GPA|approval of/i.test(prereqText)) {
    entry = { note: prereqText.replace(/\s+/g, ' ').trim() }
  }

  // --- Pattern H: WRIT-specific prereqs ---
  if (!entry && /WRIT\s+\d{5}/i.test(prereqText)) {
    const writCodes = [...prereqText.matchAll(/(WRIT\s+\d{5})/gi)].map(m => m[1])
    if (writCodes.length === 1) {
      entry = { require: [[writCodes[0]]] }
    } else if (writCodes.length > 1) {
      // Check if OR or AND
      if (/\bor\b/i.test(prereqText)) {
        entry = { require: [writCodes] }
      } else {
        entry = { require: writCodes.map(c => [c]) }
      }
    }
  }

  // --- Pattern I: Cross-departmental (e.g., WGST 20003) ---
  if (!entry && /^[A-Z]{3,4}\s+\d{5}/i.test(prereqText)) {
    const crossMatch = prereqText.match(/^([A-Z]{3,4}\s+\d{5})/)
    if (crossMatch) {
      entry = { require: [[crossMatch[1]]] }
    }
  }

  // --- Pattern J: Digital Culture/DCDA major or minor alternative ---
  if (!entry && /Digital Culture/i.test(prereqText)) {
    // Usually "CRWT intro OR DCDA major/minor"
    if (/10203/i.test(prereqText)) {
      entry = {
        require: [['CRWT 10203', 'CRWT 20103', 'CRWT 20133']],
        note: 'Also open to Digital Culture and Data Analytics majors/minors'
      }
    }
  }

  if (entry) {
    result[code] = entry
    matched++
  } else {
    unmatched.push({ code, prereqText })
  }
}

// Sort by course code
const sorted = Object.fromEntries(
  Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
)

// Write output
writeFileSync(outputPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')

console.log(`✅ Generated prerequisites for ${matched} courses`)
console.log(`   Output: ${outputPath}`)

if (unmatched.length > 0) {
  console.log(`\n⚠️  ${unmatched.length} courses with unmatched prerequisite patterns:`)
  for (const { code, prereqText } of unmatched) {
    console.log(`   ${code}: "${prereqText.substring(0, 80)}..."`)
  }
}

// Summary by pattern type
const patterns = {
  'common-engl': 0,
  'crwt-intro-or': 0,
  'crwt-advanced': 0,
  'and-combo': 0,
  'single': 0,
  'note-only': 0,
  'other': 0,
}

for (const entry of Object.values(sorted)) {
  if (!entry.require && entry.note) patterns['note-only']++
  else if (entry.require?.some(g => g.includes('@any-lower-div'))) patterns['common-engl']++
  else if (entry.require?.length === 1 && entry.require[0].includes('CRWT 10203')) patterns['crwt-intro-or']++
  else if (entry.require?.length === 2 && entry.require[0].includes('CRWT 10203')) patterns['crwt-advanced']++
  else if (entry.require?.length === 1 && entry.require[0].length === 1) patterns['single']++
  else if (entry.require?.length > 1) patterns['and-combo']++
  else patterns['other']++
}

console.log('\n📊 Pattern distribution:')
for (const [pattern, count] of Object.entries(patterns)) {
  if (count > 0) console.log(`   ${pattern}: ${count}`)
}
