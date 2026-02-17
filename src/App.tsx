import { useState } from 'react'
import { WizardShell } from '@/components/wizard'
import type { WizardPhase, WizardStep } from '@/types'
import type { PhaseInfo } from '@/components/wizard/StepIndicator'

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
  const [stepIndex, setStepIndex] = useState(0)
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

  // Welcome screen has no progress bar or back button
  const isWelcome = currentStep.id === 'welcome'

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
      showBackButton={!isWelcome}
      showNextButton={true}
    >
      {/* Placeholder step content */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{currentStep.title}</h2>
        <p className="text-sm text-muted-foreground">
          Phase: {currentStep.phase} — Step: {currentStep.id}
        </p>
        <div className="p-6 rounded-xl border-2 border-dashed border-border text-center text-muted-foreground">
          Step content will go here
        </div>
      </div>
    </WizardShell>
  )
}
