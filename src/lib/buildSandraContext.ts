import type { StudentData, WizardStepId } from '@/types'
import { getProgram, computeProgress, getLowerDivisionHours, getCourseTitle, getNextSemesterTerm, getOverlayProgress } from '@/services/courses'

const STEP_LABELS: Record<WizardStepId, string> = {
  welcome: 'Welcome',
  setup: 'Setup',
  completed: 'Marking Completed Courses',
  semester: 'Planning Next Semester',
  future: 'Reviewing Future Plan',
  reviewSummary: 'Reviewing Degree Summary',
  reviewActions: 'Saving & Submitting Plan',
}

function formatCourseList(codes: string[]): string {
  return codes.map(code => {
    const title = getCourseTitle(code)
    return title ? `${code} (${title})` : code
  }).join(', ')
}

export interface SandraContext {
  context: string
  programName: string
}

export function buildSandraContext(
  studentData: StudentData,
  currentStepId: WizardStepId
): SandraContext | null {
  if (!studentData.program) return null

  const program = getProgram(studentData.program)
  const lines: string[] = []

  lines.push(`Wizard: TCU English Department Advising Wizard`)
  lines.push(`Program: ${program.name} (${program.totalHours} hours required)`)
  lines.push(`Current step: ${STEP_LABELS[currentStepId]}`)

  if (studentData.expectedGraduation) {
    lines.push(`Expected graduation: ${studentData.expectedGraduation}`)
  }

  // Progress
  const allCourses = [...studentData.completedCourses, ...studentData.plannedCourses]
  const completedProgress = computeProgress(studentData.program, studentData.completedCourses)
  const totalProgress = computeProgress(studentData.program, allCourses)

  lines.push(`Completed: ${completedProgress.completedHours} of ${program.totalHours} hours (${completedProgress.percent}%)`)

  if (studentData.completedCourses.length > 0) {
    lines.push(`Completed courses: ${formatCourseList(studentData.completedCourses)}`)
  }

  if (studentData.plannedCourses.length > 0) {
    lines.push(`Planned for ${getNextSemesterTerm()}: ${formatCourseList(studentData.plannedCourses)}`)
    lines.push(`Projected total with planned: ${totalProgress.completedHours} of ${program.totalHours} hours`)
  }

  // Remaining categories
  const remaining = Object.entries(completedProgress.byCategory)
    .filter(([, cat]) => cat.completed < cat.required)
    .map(([, cat]) => `${cat.name} (${cat.required - cat.completed} hrs needed)`)

  if (remaining.length > 0) {
    lines.push(`Still needed: ${remaining.join(', ')}`)
  }

  if (studentData.notYetCategories?.length) {
    const notYetNames = studentData.notYetCategories.map(key => {
      const cat = completedProgress.byCategory[key]
      return cat?.name ?? key
    })
    lines.push(`Categories student hasn't started: ${notYetNames.join(', ')}`)
  }

  // Overlay requirements
  const overlays = getOverlayProgress(studentData.program, allCourses)
  if (overlays.length > 0) {
    const overlayLines = overlays.map(o => {
      const status = o.completed >= o.required ? 'met' : `${o.completed}/${o.required} hrs`
      return `${o.name} (${status})`
    })
    lines.push(`Overlay requirements: ${overlayLines.join(', ')}`)
  }

  // Lower-division warning
  if (program.maxLowerDivision) {
    const lowerHours = getLowerDivisionHours(allCourses, studentData.program)
    lines.push(`Lower-division hours: ${lowerHours} of ${program.maxLowerDivision} max`)
    if (lowerHours >= program.maxLowerDivision) {
      lines.push(`WARNING: At or over lower-division hour limit`)
    }
  }

  return { context: lines.join('\n'), programName: program.name }
}
