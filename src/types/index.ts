// ============================================
// English Department Advising Wizard — Types
// Mirrors DCDA types structure for maintainability
// ============================================

// Program IDs
export type ProgramId = 'english' | 'writing' | 'creativeWriting'

// Course from programs.json
export interface Course {
  code: string
  title: string
  hours: number
  level?: 'lower' // Lower-division courses
}

// Requirement category within a program
export interface RequirementCategory {
  name: string
  hours: number
  courses: Course[]
}

// Full program definition from programs.json
export interface ProgramData {
  name: string
  totalHours: number
  maxLowerDivision?: number
  description: string
  requirements: Record<string, RequirementCategory>
}

// All programs keyed by ProgramId
export type ProgramsData = Record<ProgramId, ProgramData>

// Prerequisites — AND-of-OR model
/** A single OR-group: student must have completed/planned at least ONE of these */
export type OrGroup = string[]

/** Full prerequisite entry for one course */
export interface PrerequisiteEntry {
  /** AND-of-OR groups. Each inner array is an OR-group; ALL groups must be satisfied. */
  require?: OrGroup[]
  /** Recommended (not required) courses — shown as info, not warning */
  recommend?: string[]
  /** Free-text note for non-modelable requirements (standing, grade, major-only) */
  note?: string
}

/** The full prerequisites data structure, keyed by course code */
export type PrerequisitesData = Record<string, PrerequisiteEntry>

/** Result of checking prerequisites for a single course */
export interface PrerequisiteCheckResult {
  met: boolean
  unmetGroups: OrGroup[]
  entry: PrerequisiteEntry | null
}

// Four-year plan data
export interface FourYearPlanSemester {
  semester: string
  courses: string[]
}

export interface FourYearPlan {
  name: string
  semesters: FourYearPlanSemester[]
}

// Student data (stored in localStorage)
export interface StudentData {
  name: string
  program: ProgramId | null
  expectedGraduation: string | null
  totalCreditHours: number
  completedCourses: string[]     // Step 1: already taken
  plannedCourses: string[]       // Step 2: next semester
  notes?: string
}

// Wizard phases — different from DCDA since English uses 3-phase course selection
export type WizardPhase = 'setup' | 'completed' | 'semester' | 'future' | 'review'

export type WizardStepId =
  | 'welcome'
  | 'setup'
  | 'completed'
  | 'semester'
  | 'future'
  | 'reviewSummary'
  | 'reviewActions'

export interface WizardStep {
  id: WizardStepId
  phase: WizardPhase
  title: string
}

// Wizard state
export interface WizardState {
  currentStepIndex: number
  completedSteps: WizardStepId[]
}
