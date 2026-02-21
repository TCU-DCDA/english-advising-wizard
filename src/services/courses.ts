import type { ProgramId, ProgramData, RequirementCategory, PrerequisitesData, PrerequisiteEntry, PrerequisiteCheckResult, OrGroup } from '@/types'
import type { CatalogCourse } from '@/data/allCourses'
import { allCourses } from '@/data/allCourses'
import programsData from '@/data/programs.json'
import prerequisitesData from '@/data/prerequisites.json'

const programs = programsData as Record<ProgramId, ProgramData>
const prerequisites = prerequisitesData as PrerequisitesData

export function getCourseTitle(code: string): string | undefined {
  return allCourses.find(c => c.code === code)?.title
}

export function getProgram(id: ProgramId): ProgramData {
  return programs[id]
}

export function getAllPrograms(): Array<{ id: ProgramId; program: ProgramData }> {
  return (Object.entries(programs) as Array<[ProgramId, ProgramData]>).map(
    ([id, program]) => ({ id, program })
  )
}

export function getCategoriesForProgram(
  id: ProgramId
): Array<{ key: string; category: RequirementCategory }> {
  const program = programs[id]
  return Object.entries(program.requirements).map(([key, category]) => ({
    key,
    category,
  }))
}

interface CategoryProgress {
  name: string
  required: number
  completed: number
}

interface DegreeProgress {
  totalHours: number
  completedHours: number
  percent: number
  byCategory: Record<string, CategoryProgress>
}

export function computeProgress(
  programId: ProgramId,
  completedCourses: string[]
): DegreeProgress {
  const program = programs[programId]
  const byCategory: Record<string, CategoryProgress> = {}
  let completedHours = 0

  // Build set of course codes in non-elective categories (for elective calculation)
  const specificCodes = new Set<string>()
  for (const category of Object.values(program.requirements)) {
    if (!isElectiveCategory(category)) {
      for (const course of category.courses) {
        specificCodes.add(course.code)
      }
    }
  }

  for (const [key, category] of Object.entries(program.requirements)) {
    let rawHours: number

    if (isElectiveCategory(category)) {
      // For elective categories, count completed courses NOT in any specific category
      rawHours = completedCourses
        .filter((code) => !specificCodes.has(code))
        .reduce((sum, code) => {
          const catalogCourse = allCourses.find((c) => c.code === code)
          return sum + (catalogCourse?.hours ?? 0)
        }, 0)
    } else {
      const matchingCourses = category.courses.filter((c) =>
        completedCourses.includes(c.code)
      )
      rawHours = matchingCourses.reduce((sum, c) => sum + c.hours, 0)
    }

    const capped = Math.min(rawHours, category.hours)

    byCategory[key] = {
      name: category.name,
      required: category.hours,
      completed: capped,
    }
    completedHours += capped
  }

  return {
    totalHours: program.totalHours,
    completedHours,
    percent: program.totalHours > 0
      ? Math.round((completedHours / program.totalHours) * 100)
      : 0,
    byCategory,
  }
}

export function getLowerDivisionHours(
  completedCourses: string[],
  programId: ProgramId
): number {
  const program = programs[programId]
  const counted = new Set<string>()
  let hours = 0

  for (const category of Object.values(program.requirements)) {
    for (const course of category.courses) {
      if (
        course.level === 'lower' &&
        completedCourses.includes(course.code) &&
        !counted.has(course.code)
      ) {
        counted.add(course.code)
        hours += course.hours
      }
    }
  }

  return hours
}

export function isElectiveCategory(category: RequirementCategory): boolean {
  return category.courses.some((c) => c.code === 'ANY')
}

export function getElectiveCourses(programId: ProgramId): CatalogCourse[] {
  const program = programs[programId]

  // Build set of all course codes in non-elective categories
  const specificCodes = new Set<string>()
  for (const category of Object.values(program.requirements)) {
    if (!isElectiveCategory(category)) {
      for (const course of category.courses) {
        specificCodes.add(course.code)
      }
    }
  }

  // Return all catalog courses not in specific categories
  return allCourses.filter((c) => !specificCodes.has(c.code))
}

export function computeProjectedProgress(
  programId: ProgramId,
  completedCourses: string[],
  plannedCourses: string[]
): DegreeProgress {
  const combined = [...new Set([...completedCourses, ...plannedCourses])]
  return computeProgress(programId, combined)
}

const LOWER_DIV_RE = /^(ENGL|WRIT|CRWT) [12]\d{4}$/

function isSatisfied(item: string, all: string[]): boolean {
  if (item === '@any-lower-div') {
    return all.some((c) => LOWER_DIV_RE.test(c))
  }
  return all.includes(item)
}

export function checkPrerequisites(
  courseCode: string,
  completedCourses: string[],
  plannedCourses: string[]
): PrerequisiteCheckResult {
  const entry = prerequisites[courseCode] ?? null
  if (!entry || !entry.require || entry.require.length === 0) {
    return { met: true, unmetGroups: [], entry }
  }

  const all = [...new Set([...completedCourses, ...plannedCourses])]
  const unmetGroups: OrGroup[] = []

  for (const orGroup of entry.require) {
    if (!orGroup.some((item) => isSatisfied(item, all))) {
      unmetGroups.push(orGroup)
    }
  }

  return { met: unmetGroups.length === 0, unmetGroups, entry }
}

export function getPrerequisites(courseCode: string): PrerequisiteEntry | null {
  return prerequisites[courseCode] ?? null
}

// --- Future planning ---

export interface RemainingCategory {
  key: string
  name: string
  hoursNeeded: number
  totalRequired: number
  scheduled: number
}

export function getRemainingCategories(
  programId: ProgramId,
  completedCourses: string[],
  plannedCourses: string[]
): RemainingCategory[] {
  const projected = computeProjectedProgress(programId, completedCourses, plannedCourses)
  const program = programs[programId]
  const remaining: RemainingCategory[] = []

  for (const [key, category] of Object.entries(program.requirements)) {
    const cat = projected.byCategory[key]
    if (cat && cat.completed < cat.required) {
      remaining.push({
        key,
        name: category.name,
        hoursNeeded: cat.required - cat.completed,
        totalRequired: cat.required,
        scheduled: cat.completed,
      })
    }
  }

  return remaining
}

export interface SemesterPlan {
  semester: string
  categories: Array<{ key: string; name: string; hoursNeeded: number }>
}

export function generateSemesterPlan(
  expectedGraduation: string,
  remainingCategories: RemainingCategory[]
): SemesterPlan[] {
  if (remainingCategories.length === 0) return []

  const [gradSem, gradYearStr] = expectedGraduation.split(' ')
  const gradYear = parseInt(gradYearStr)
  const now = new Date()
  const currentMonth = now.getMonth() // 0-indexed
  const currentYear = now.getFullYear()

  // Determine starting semester (skip current, start with next)
  let sem: 'Spring' | 'Fall' = currentMonth >= 8 ? 'Spring' : 'Fall'
  let year = currentMonth >= 8 ? currentYear + 1 : currentYear

  // Generate semester slots until graduation (Spring/Fall only)
  const slots: string[] = []
  while (slots.length < 12) {
    const label = `${sem} ${year}`
    slots.push(label)

    // Stop if we've reached graduation
    if (year === gradYear && sem === gradSem) break

    // Advance
    if (sem === 'Spring') {
      sem = 'Fall'
    } else {
      sem = 'Spring'
      year++
    }

    // Stop if past graduation
    if (year > gradYear) break
  }

  if (slots.length === 0) return []

  // Prioritize: prerequisites first, junior seminars, then larger requirements
  const prioritized = [...remainingCategories].sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()

    if (aName.includes('prerequisite') && !bName.includes('prerequisite')) return -1
    if (!aName.includes('prerequisite') && bName.includes('prerequisite')) return 1

    if ((aName.includes('junior') || aName.includes('seminar')) &&
        !(bName.includes('junior') || bName.includes('seminar'))) return -1
    if (!(aName.includes('junior') || aName.includes('seminar')) &&
        (bName.includes('junior') || bName.includes('seminar'))) return 1

    return b.hoursNeeded - a.hoursNeeded
  })

  // Round-robin distribute across semesters
  const distribution: SemesterPlan[] = slots.map((s) => ({
    semester: s,
    categories: [],
  }))

  let idx = 0
  for (const cat of prioritized) {
    if (idx >= distribution.length) idx = 0
    distribution[idx].categories.push({
      key: cat.key,
      name: cat.name,
      hoursNeeded: cat.hoursNeeded,
    })
    idx++
  }

  return distribution.filter((d) => d.categories.length > 0)
}

export function generateGraduationSemesters(): Array<{
  label: string
  value: string
}> {
  const semesters: Array<{ label: string; value: string }> = []
  let semester: 'Spring' | 'Summer' | 'Fall' = 'Spring'
  let year = 2026

  for (let i = 0; i < 9; i++) {
    const value = `${semester} ${year}`
    semesters.push({ label: value, value })

    if (semester === 'Spring') {
      semester = 'Summer'
    } else if (semester === 'Summer') {
      semester = 'Fall'
    } else {
      semester = 'Spring'
      year++
    }
  }

  return semesters
}
