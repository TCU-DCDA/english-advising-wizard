import { describe, it, expect } from 'vitest'
import {
  getProgram,
  getAllPrograms,
  getCategoriesForProgram,
  computeProgress,
  getLowerDivisionHours,
  isElectiveCategory,
  getElectiveCourses,
  computeProjectedProgress,
  checkPrerequisites,
  getPrerequisites,
  getRemainingCategories,
  generateSemesterPlan,
  generateGraduationSemesters,
} from '../courses'

describe('getProgram', () => {
  it('returns the English program', () => {
    const program = getProgram('english')
    expect(program.name).toBe('English')
    expect(program.totalHours).toBe(33)
  })

  it('returns the Writing program', () => {
    const program = getProgram('writing')
    expect(program.name).toContain('Writing')
  })

  it('returns the Creative Writing program', () => {
    const program = getProgram('creativeWriting')
    expect(program.name).toContain('Creative Writing')
  })
})

describe('getAllPrograms', () => {
  it('returns all 3 programs', () => {
    const programs = getAllPrograms()
    expect(programs).toHaveLength(3)
    const ids = programs.map((p) => p.id)
    expect(ids).toContain('english')
    expect(ids).toContain('writing')
    expect(ids).toContain('creativeWriting')
  })
})

describe('getCategoriesForProgram', () => {
  it('returns categories with keys for English', () => {
    const categories = getCategoriesForProgram('english')
    expect(categories.length).toBeGreaterThan(0)
    expect(categories[0]).toHaveProperty('key')
    expect(categories[0]).toHaveProperty('category')
    expect(categories[0].category).toHaveProperty('name')
    expect(categories[0].category).toHaveProperty('hours')
    expect(categories[0].category).toHaveProperty('courses')
  })

  it('returns different categories for each program', () => {
    const english = getCategoriesForProgram('english')
    const writing = getCategoriesForProgram('writing')
    const englishKeys = english.map((c) => c.key)
    const writingKeys = writing.map((c) => c.key)
    // Programs have different requirement structures
    expect(englishKeys).not.toEqual(writingKeys)
  })
})

describe('computeProgress', () => {
  it('returns 0% with no completed courses', () => {
    const progress = computeProgress('english', [])
    expect(progress.completedHours).toBe(0)
    expect(progress.percent).toBe(0)
    expect(progress.totalHours).toBe(33)
  })

  it('counts hours from completed courses', () => {
    // ENGL 20503 is a 3-hour American Lit course
    const progress = computeProgress('english', ['ENGL 20503'])
    expect(progress.completedHours).toBe(3)
    expect(progress.percent).toBe(Math.round((3 / 33) * 100))
  })

  it('caps hours at category maximum', () => {
    // American Lit category requires 6 hours — complete 3 courses (9 hours) but should cap at 6
    const progress = computeProgress('english', [
      'ENGL 20503', // 3 hrs
      'ENGL 20523', // 3 hrs
      'ENGL 30133', // 3 hrs — exceeds 6-hour category cap
    ])
    expect(progress.byCategory['americanLit'].completed).toBe(6)
    expect(progress.byCategory['americanLit'].required).toBe(6)
  })

  it('tracks progress across multiple categories', () => {
    const progress = computeProgress('english', [
      'ENGL 20503', // American Lit (3 hrs)
      'ENGL 20403', // British Lit (3 hrs)
    ])
    expect(progress.completedHours).toBe(6)
    expect(progress.byCategory['americanLit'].completed).toBe(3)
    expect(progress.byCategory['britishLit'].completed).toBe(3)
  })

  it('ignores courses not in program requirements', () => {
    // CRWT courses are not in English program's specific categories
    // They may count as electives if the program has an elective category
    const progressWithout = computeProgress('english', [])
    const progressWith = computeProgress('english', ['FAKE 99999'])
    expect(progressWith.completedHours).toBe(progressWithout.completedHours)
  })
})

describe('getLowerDivisionHours', () => {
  it('returns 0 with no courses', () => {
    expect(getLowerDivisionHours([], 'english')).toBe(0)
  })

  it('counts lower-division courses', () => {
    // ENGL 20503 is marked as level: "lower"
    expect(getLowerDivisionHours(['ENGL 20503'], 'english')).toBe(3)
  })

  it('does not count upper-division courses', () => {
    // ENGL 30133 has no level field (upper-division)
    expect(getLowerDivisionHours(['ENGL 30133'], 'english')).toBe(0)
  })

  it('does not double-count courses appearing in multiple categories', () => {
    const hours = getLowerDivisionHours(['ENGL 20503'], 'english')
    expect(hours).toBe(3)
  })
})

describe('isElectiveCategory', () => {
  it('returns true for categories with ANY course', () => {
    const categories = getCategoriesForProgram('english')
    const elective = categories.find((c) => c.category.courses.some((course) => course.code === 'ANY'))
    if (elective) {
      expect(isElectiveCategory(elective.category)).toBe(true)
    }
  })

  it('returns false for specific-course categories', () => {
    const categories = getCategoriesForProgram('english')
    const americanLit = categories.find((c) => c.key === 'americanLit')
    expect(americanLit).toBeDefined()
    expect(isElectiveCategory(americanLit!.category)).toBe(false)
  })
})

describe('getElectiveCourses', () => {
  it('returns courses not in specific categories', () => {
    const electives = getElectiveCourses('english')
    expect(electives.length).toBeGreaterThan(0)
    // Elective courses should not include courses that appear in named categories
    const categories = getCategoriesForProgram('english')
    const specificCodes = new Set<string>()
    for (const { category } of categories) {
      if (!isElectiveCategory(category)) {
        for (const course of category.courses) {
          specificCodes.add(course.code)
        }
      }
    }
    for (const elective of electives) {
      expect(specificCodes.has(elective.code)).toBe(false)
    }
  })
})

describe('computeProjectedProgress', () => {
  it('combines completed and planned courses', () => {
    const projected = computeProjectedProgress(
      'english',
      ['ENGL 20503'], // completed
      ['ENGL 20403']  // planned
    )
    expect(projected.completedHours).toBe(6)
  })

  it('deduplicates courses in both lists', () => {
    const projected = computeProjectedProgress(
      'english',
      ['ENGL 20503'],
      ['ENGL 20503'] // same course in both
    )
    // Should count only once
    expect(projected.completedHours).toBe(3)
  })
})

describe('checkPrerequisites', () => {
  it('returns met=true for courses with no prerequisites', () => {
    const result = checkPrerequisites('ENGL 20503', [], [])
    expect(result.met).toBe(true)
    expect(result.required).toEqual([])
  })

  it('returns met=false when prerequisites not completed', () => {
    // ENGL 38023 requires ENGL 20803
    const result = checkPrerequisites('ENGL 38023', [], [])
    expect(result.met).toBe(false)
    expect(result.required).toContain('ENGL 20803')
  })

  it('returns met=true when prerequisite is completed', () => {
    const result = checkPrerequisites('ENGL 38023', ['ENGL 20803'], [])
    expect(result.met).toBe(true)
  })

  it('returns met=true when prerequisite is planned', () => {
    const result = checkPrerequisites('ENGL 38023', [], ['ENGL 20803'])
    expect(result.met).toBe(true)
  })

  it('handles courses with multiple prerequisites (any-of)', () => {
    // CRWT 40703 requires any of: CRWT 30343, CRWT 30353, CRWT 30233, CRWT 30373
    const result = checkPrerequisites('CRWT 40703', ['CRWT 30343'], [])
    expect(result.met).toBe(true)
  })
})

describe('getPrerequisites', () => {
  it('returns prerequisites for a course that has them', () => {
    const prereqs = getPrerequisites('ENGL 38023')
    expect(prereqs).toEqual(['ENGL 20803'])
  })

  it('returns null for a course with no prerequisites', () => {
    const prereqs = getPrerequisites('ENGL 20503')
    expect(prereqs).toBeNull()
  })
})

describe('getRemainingCategories', () => {
  it('returns all categories when nothing is completed', () => {
    const remaining = getRemainingCategories('english', [], [])
    expect(remaining.length).toBeGreaterThan(0)
    for (const cat of remaining) {
      expect(cat.hoursNeeded).toBeGreaterThan(0)
    }
  })

  it('excludes fully completed categories', () => {
    // Complete American Lit (6 hrs needed)
    const remaining = getRemainingCategories(
      'english',
      ['ENGL 20503', 'ENGL 20523'], // 6 hours in American Lit
      []
    )
    const americanLit = remaining.find((c) => c.key === 'americanLit')
    expect(americanLit).toBeUndefined()
  })

  it('shows partial progress in remaining', () => {
    const remaining = getRemainingCategories(
      'english',
      ['ENGL 20503'], // 3 of 6 hours in American Lit
      []
    )
    const americanLit = remaining.find((c) => c.key === 'americanLit')
    expect(americanLit).toBeDefined()
    expect(americanLit!.hoursNeeded).toBe(3)
  })
})

describe('generateSemesterPlan', () => {
  it('returns empty array when no remaining categories', () => {
    const plan = generateSemesterPlan('Spring 2028', [])
    expect(plan).toEqual([])
  })

  it('distributes categories across semesters', () => {
    const remaining = [
      { key: 'a', name: 'Category A', hoursNeeded: 6, totalRequired: 6, scheduled: 0 },
      { key: 'b', name: 'Category B', hoursNeeded: 3, totalRequired: 3, scheduled: 0 },
    ]
    const plan = generateSemesterPlan('Spring 2028', remaining)
    expect(plan.length).toBeGreaterThan(0)
    // All categories should appear somewhere in the plan
    const allCats = plan.flatMap((s) => s.categories.map((c) => c.key))
    expect(allCats).toContain('a')
    expect(allCats).toContain('b')
  })

  it('prioritizes prerequisite categories', () => {
    const remaining = [
      { key: 'elective', name: 'English Elective', hoursNeeded: 6, totalRequired: 6, scheduled: 0 },
      { key: 'prereq', name: 'Prerequisite Course', hoursNeeded: 3, totalRequired: 3, scheduled: 0 },
    ]
    const plan = generateSemesterPlan('Spring 2028', remaining)
    // Prerequisite category should be in first semester
    expect(plan[0].categories[0].key).toBe('prereq')
  })
})

describe('generateGraduationSemesters', () => {
  it('returns 9 semester options', () => {
    const semesters = generateGraduationSemesters()
    expect(semesters).toHaveLength(9)
  })

  it('starts with Spring 2026', () => {
    const semesters = generateGraduationSemesters()
    expect(semesters[0].value).toBe('Spring 2026')
  })

  it('cycles through Spring, Summer, Fall', () => {
    const semesters = generateGraduationSemesters()
    expect(semesters[0].value).toContain('Spring')
    expect(semesters[1].value).toContain('Summer')
    expect(semesters[2].value).toContain('Fall')
    expect(semesters[3].value).toContain('Spring')
  })

  it('has matching label and value', () => {
    const semesters = generateGraduationSemesters()
    for (const sem of semesters) {
      expect(sem.label).toBe(sem.value)
    }
  })
})
