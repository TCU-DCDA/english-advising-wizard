import { useState } from 'react'
import { BookOpen, PenTool, FileText, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllPrograms, generateGraduationSemesters } from '@/services/courses'
import type { ProgramId } from '@/types'

interface SetupStepProps {
  program: ProgramId | null
  expectedGraduation: string | null
  onProgramChange: (id: ProgramId) => void
  onGraduationChange: (value: string) => void
}

const PROGRAM_ICONS: Record<ProgramId, typeof BookOpen> = {
  english: BookOpen,
  writing: PenTool,
  creativeWriting: FileText,
}

export function SetupStep({
  program,
  expectedGraduation,
  onProgramChange,
  onGraduationChange,
}: SetupStepProps) {
  const [showComparison, setShowComparison] = useState(false)
  const allPrograms = getAllPrograms()
  const semesters = generateGraduationSemesters()

  const selectedProgram = allPrograms.find((p) => p.id === program)

  return (
    <div className="space-y-8">
      {/* Section A: Program Picker */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold mb-1">Which program are you in?</h2>
          <p className="text-sm text-muted-foreground">
            Select your major to see the right requirements.
          </p>
        </div>

        <div className="space-y-3">
          {allPrograms.map(({ id, program: prog }) => {
            const Icon = PROGRAM_ICONS[id]
            const isSelected = program === id

            return (
              <button
                key={id}
                onClick={() => onProgramChange(id)}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3',
                  isSelected
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg shrink-0 mt-0.5',
                    isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{prog.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {prog.totalHours} hrs
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {prog.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Compare Programs collapsible */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="w-full bg-muted/50 border rounded-lg p-3 text-left transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium flex-1">Compare Programs</span>
            {showComparison ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {showComparison && (
          <div className="border rounded-lg overflow-hidden text-sm -mt-1">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-left font-medium">Requirement</th>
                    <th className="px-3 py-2 text-center font-medium">ENGL</th>
                    <th className="px-3 py-2 text-center font-medium">W&amp;R</th>
                    <th className="px-3 py-2 text-center font-medium">CW</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground">Total Hours</td>
                    <td className="px-3 py-2 text-center font-medium">33</td>
                    <td className="px-3 py-2 text-center font-medium">33</td>
                    <td className="px-3 py-2 text-center font-medium">33</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground">Max Lower-Division</td>
                    <td className="px-3 py-2 text-center">9 hrs</td>
                    <td className="px-3 py-2 text-center">12 hrs</td>
                    <td className="px-3 py-2 text-center">3 hrs</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground">Categories</td>
                    <td className="px-3 py-2 text-center">6</td>
                    <td className="px-3 py-2 text-center">7</td>
                    <td className="px-3 py-2 text-center">6</td>
                  </tr>
                  {/* Per-program category breakdown */}
                  {allPrograms.map(({ id, program: prog }) => (
                    <tr key={id}>
                      <td colSpan={4} className="px-3 py-2">
                        <div className="font-medium text-foreground mb-1">{prog.name}</div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {Object.values(prog.requirements).map((cat) => (
                            <div key={cat.name}>
                              {cat.name} ({cat.hours} hrs)
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Section B: Graduation Semester */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold mb-1">When do you expect to graduate?</h2>
          <p className="text-sm text-muted-foreground">
            Select your target graduation semester.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {semesters.map((sem) => (
            <button
              key={sem.value}
              onClick={() => onGraduationChange(sem.value)}
              className={cn(
                'p-4 rounded-xl border-2 text-center transition-all',
                expectedGraduation === sem.value
                  ? 'border-primary bg-accent'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div className="font-semibold">{sem.value.split(' ')[0]}</div>
              <div className="text-sm text-muted-foreground">{sem.value.split(' ')[1]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Lower-division info */}
      {selectedProgram && selectedProgram.program.maxLowerDivision && (
        <div className="bg-muted/50 border rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="size-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong>{selectedProgram.program.name}</strong> allows a maximum of{' '}
              <strong>{selectedProgram.program.maxLowerDivision} hours</strong> of
              lower-division (10000–20000 level) courses toward the major.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
