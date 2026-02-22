import { useState, useEffect, useMemo } from 'react'
import { WizardShell } from '@/components/wizard'
import { WelcomeStep, SetupStep, CompletedCoursesStep, SemesterStep, FutureStep, ReviewSummaryStep, ReviewActionsStep } from '@/components/wizard/steps'
import { useStudentData } from '@/hooks/useStudentData'
import { getProgram, getCategoriesForProgram, isElectiveCategory } from '@/services/courses'
import { buildSandraContext } from '@/lib/buildSandraContext'
import type { WizardPhase, WizardStep, ProgramId } from '@/types'
import type { PhaseInfo } from '@/components/wizard/StepIndicator'

const STEP_STORAGE_KEY = 'english-wizard-step-index'

// Define wizard steps
const STEPS: WizardStep[] = [
  { id: 'welcome', phase: 'setup', title: 'Welcome' },
  { id: 'setup', phase: 'setup', title: 'Setup' },
  { id: 'completed', phase: 'completed', title: 'Completed Courses' },
  { id: 'semester', phase: 'semester', title: 'Coming Semester' },
  { id: 'future', phase: 'future', title: 'Future Plan' },
  { id: 'reviewSummary', phase: 'review', title: 'Review' },
  { id: 'reviewActions', phase: 'review', title: 'Save & Submit' },
]

function computePhases(steps: WizardStep[]): PhaseInfo[] {
  const phaseOrder: WizardPhase[] = ['setup', 'completed', 'semester', 'future', 'review']
  return phaseOrder.map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    stepCount: steps.filter(s => s.phase === key).length,
  }))
}

function computeStepInPhase(stepIndex: number, steps: WizardStep[]): number {
  const currentStep = steps[stepIndex]
  if (!currentStep) return 0
  let count = 0
  for (let i = 0; i < stepIndex; i++) {
    if (steps[i].phase === currentStep.phase) count++
  }
  return count
}

export default function App() {
  const { studentData, updateStudentData, toggleCompletedCourse, togglePlannedCourse, toggleNotYetCategory, clearNotYetCategory, resetStudentData } = useStudentData()

  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const stored = localStorage.getItem(STEP_STORAGE_KEY)
      if (stored) {
        const index = parseInt(stored, 10)
        if (!isNaN(index) && index >= 0 && index < STEPS.length) {
          // If past setup step, validate that required data exists
          if (index > 1 && !studentData.program) {
            return 0
          }
          return index
        }
      }
    } catch {}
    return 0
  })

  useEffect(() => {
    try {
      localStorage.setItem(STEP_STORAGE_KEY, String(stepIndex))
    } catch {}
  }, [stepIndex])

  const currentStep = STEPS[stepIndex]
  const phases = computePhases(STEPS)
  const currentStepInPhase = computeStepInPhase(stepIndex, STEPS)

  const canGoBack = stepIndex > 0
  const canGoNext = stepIndex < STEPS.length - 1

  const goBack = () => {
    if (canGoBack) setStepIndex(stepIndex - 1)
  }
  const goNext = () => {
    if (canGoNext) setStepIndex(stepIndex + 1)
  }

  // Per-step validation for Next button
  const getNextDisabled = (): boolean => {
    switch (currentStep.id) {
      case 'setup':
        return !studentData.name.trim() || !studentData.program || !studentData.expectedGraduation
      case 'completed': {
        if (!studentData.program) return true
        const cats = getCategoriesForProgram(studentData.program)
        // Build set of all codes in specific (non-elective) categories
        const specificCodes = new Set<string>()
        for (const { category } of cats) {
          if (!isElectiveCategory(category)) {
            for (const c of category.courses) specificCodes.add(c.code)
          }
        }
        return !cats.every(({ key, category }) => {
          if (studentData.notYetCategories.includes(key)) return true
          if (isElectiveCategory(category)) {
            return studentData.completedCourses.some((c) => !specificCodes.has(c))
          }
          return category.courses.some((c) => studentData.completedCourses.includes(c.code))
        })
      }
      default:
        return false
    }
  }

  // Welcome screen has no progress bar or back button
  const isWelcome = currentStep.id === 'welcome'

  // Build Sandra context from current wizard state
  const sandraData = useMemo(
    () => buildSandraContext(studentData, currentStep.id),
    [studentData, currentStep.id]
  )

  // Render step content based on current step
  function renderStep() {
    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep />
      case 'setup':
        return (
          <SetupStep
            name={studentData.name}
            email={studentData.email || ''}
            program={studentData.program}
            expectedGraduation={studentData.expectedGraduation}
            onNameChange={(value: string) => updateStudentData({ name: value })}
            onEmailChange={(value: string) => updateStudentData({ email: value })}
            onProgramChange={(id: ProgramId) => updateStudentData({ program: id })}
            onGraduationChange={(value: string) => updateStudentData({ expectedGraduation: value })}
          />
        )
      case 'completed':
        return (
          <CompletedCoursesStep
            programId={studentData.program!}
            completedCourses={studentData.completedCourses}
            notYetCategories={studentData.notYetCategories}
            onToggleCourse={toggleCompletedCourse}
            onToggleNotYet={toggleNotYetCategory}
            onClearNotYet={clearNotYetCategory}
          />
        )
      case 'semester':
        return (
          <SemesterStep
            programId={studentData.program!}
            completedCourses={studentData.completedCourses}
            plannedCourses={studentData.plannedCourses}
            onToggleCourse={togglePlannedCourse}
          />
        )
      case 'future':
        return (
          <FutureStep
            programId={studentData.program!}
            completedCourses={studentData.completedCourses}
            plannedCourses={studentData.plannedCourses}
            expectedGraduation={studentData.expectedGraduation}
          />
        )
      case 'reviewSummary':
        return (
          <ReviewSummaryStep
            programId={studentData.program!}
            completedCourses={studentData.completedCourses}
            plannedCourses={studentData.plannedCourses}
            notYetCategories={studentData.notYetCategories}
            expectedGraduation={studentData.expectedGraduation}
          />
        )
      case 'reviewActions':
        return (
          <ReviewActionsStep
            studentData={studentData}
            programData={getProgram(studentData.program!)}
            updateStudentData={updateStudentData}
            resetStudentData={resetStudentData}
            onRestart={() => setStepIndex(0)}
          />
        )
      default:
        return null
    }
  }

  return (
    <WizardShell
      currentPhase={currentStep.phase}
      currentStepInPhase={currentStepInPhase}
      phases={phases}
      stepKey={currentStep.id}
      canGoBack={canGoBack}
      canGoNext={canGoNext}
      onBack={goBack}
      onNext={goNext}
      nextLabel={currentStep.id === 'reviewActions' ? 'Finish' : 'Next'}
      nextDisabled={getNextDisabled()}
      showBackButton={!isWelcome}
      showNextButton={currentStep.id !== 'reviewActions'}
      sandraContext={sandraData?.context ?? null}
      sandraProgramName={sandraData?.programName ?? null}
      sandraProgramId={studentData.program ?? null}
    >
      {renderStep()}
    </WizardShell>
  )
}
