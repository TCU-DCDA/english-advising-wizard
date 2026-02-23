import { cn } from '@/lib/utils'
import type { WizardPhase } from '@/types'
import { Check } from 'lucide-react'

export interface PhaseInfo {
  key: WizardPhase
  label: string
  stepCount: number
}

interface StepIndicatorProps {
  currentPhase: WizardPhase
  currentStepInPhase: number
  phases: PhaseInfo[]
  className?: string
}

const PHASE_ORDER: WizardPhase[] = ['setup', 'completed', 'semester', 'future', 'review']

function getPhaseIndex(phase: WizardPhase): number {
  return PHASE_ORDER.indexOf(phase)
}

export function StepIndicator({ currentPhase, currentStepInPhase, phases, className }: StepIndicatorProps) {
  const currentPhaseIdx = getPhaseIndex(currentPhase)

  return (
    <div className={cn("bg-primary px-4 pt-2.5 pb-3 space-y-1.5", className)}>
      {/* Phase segments */}
      <div className="flex gap-1.5">
        {phases.map((phase) => {
          const phaseIdx = getPhaseIndex(phase.key)
          const isActive = phase.key === currentPhase
          const isComplete = phaseIdx < currentPhaseIdx

          let fillPercent = 0
          if (isComplete) {
            fillPercent = 100
          } else if (isActive) {
            const totalInPhase = phase.stepCount
            if (totalInPhase > 0) {
              fillPercent = Math.min(100, Math.round(((currentStepInPhase + 1) / totalInPhase) * 100))
            }
          }

          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center gap-1">
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider leading-none flex items-center gap-1",
                isActive
                  ? "text-white"
                  : isComplete
                    ? "text-white/70"
                    : "text-white/30"
              )}>
                {isComplete && <Check className="size-2.5" />}
                {phase.label}
              </span>
              <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-400 ease-out",
                    isComplete ? "bg-white/60" : isActive ? "bg-white" : ""
                  )}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Step counter */}
      {(() => {
        const activePhase = phases.find(p => p.key === currentPhase)
        if (!activePhase || activePhase.stepCount === 0) return null

        return (
          <div className="text-[11px] text-white/50 text-center">
            Step {currentStepInPhase + 1} of {activePhase.stepCount} in {activePhase.label}
          </div>
        )
      })()}
    </div>
  )
}
