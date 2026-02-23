import { useMemo } from 'react'
import { CalendarDays, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  getProgram,
  computeProgress,
  computeProjectedProgress,
  getRemainingCategories,
  generateSemesterPlan,
} from '@/services/courses'
import type { ProgramId } from '@/types'

interface FutureStepProps {
  programId: ProgramId
  completedCourses: string[]
  plannedCourses: string[]
  expectedGraduation: string | null
}

export function FutureStep({
  programId,
  completedCourses,
  plannedCourses,
  expectedGraduation,
}: FutureStepProps) {
  const program = getProgram(programId)
  const completedProgress = computeProgress(programId, completedCourses)
  const projectedProgress = computeProjectedProgress(programId, completedCourses, plannedCourses)
  const plannedHours = projectedProgress.completedHours - completedProgress.completedHours

  const remaining = useMemo(
    () => getRemainingCategories(programId, completedCourses, plannedCourses),
    [programId, completedCourses, plannedCourses]
  )

  const semesterPlan = useMemo(
    () => expectedGraduation ? generateSemesterPlan(expectedGraduation, remaining) : [],
    [expectedGraduation, remaining]
  )

  return (
    <div className="space-y-5">
      {/* Context banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl">
        <CalendarDays className="size-5 text-orange-600 dark:text-orange-400 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
            Future Plan
          </div>
          <div className="text-xs text-orange-600/70 dark:text-orange-400/70">
            See what's remaining and plan your path to graduation.
          </div>
        </div>
      </div>

      {/* Progress hero */}
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
            {program.name}
          </h2>
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {completedProgress.completedHours} / {projectedProgress.totalHours} hrs
            {plannedHours > 0 && (
              <span className="ml-1 text-orange-500">+{plannedHours} planned</span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-orange-200 dark:bg-orange-900 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full relative">
            <div
              className="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-400 rounded-full transition-all duration-400"
              style={{ width: `${Math.min(completedProgress.percent, 100)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-orange-500 dark:bg-orange-400 rounded-full transition-all duration-400"
              style={{ width: `${Math.min(projectedProgress.percent, 100)}%`, opacity: 0.5 }}
            />
          </div>
        </div>

        <div className="text-xs text-orange-700 dark:text-orange-400">
          {completedProgress.percent}% completed
          {plannedHours > 0 && ` \u2022 ${projectedProgress.percent}% projected`}
        </div>
      </div>

      {/* All done */}
      {remaining.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="size-12 mx-auto mb-2 text-green-600 dark:text-green-400" />
          <p className="font-medium text-green-800 dark:text-green-200">
            All requirements are satisfied!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            You've completed or planned all required hours for this major.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Remaining categories */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Requirements Still Needed ({remaining.length} {remaining.length === 1 ? 'category' : 'categories'})
            </h3>

            {remaining.map((cat) => (
              <div
                key={cat.key}
                className="border rounded-lg p-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm">{cat.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Need {cat.hoursNeeded} more hours ({cat.scheduled} / {cat.totalRequired} scheduled)
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 shrink-0">
                  {cat.hoursNeeded} hrs
                </span>
              </div>
            ))}
          </div>

          {/* Suggested semester sequence */}
          {semesterPlan.length > 0 && expectedGraduation && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CalendarDays className="size-4 text-purple-600 dark:text-purple-400" />
                Suggested Sequence to {expectedGraduation}
              </h3>

              <div className="space-y-3">
                {semesterPlan.map((sem) => {
                  const totalHours = sem.categories.reduce((sum, c) => sum + c.hoursNeeded, 0)
                  return (
                    <div
                      key={sem.semester}
                      className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50 dark:bg-purple-950/20"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="font-medium text-purple-900 dark:text-purple-200 text-sm">
                          {sem.semester}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-400">
                          {totalHours} hours
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {sem.categories.map((cat) => (
                          <div
                            key={cat.key}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="text-foreground/80">{cat.name}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium text-xs">
                              {cat.hoursNeeded} hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-muted-foreground italic">
                This is a suggested distribution. Adjust based on course availability and your schedule.
              </p>
            </div>
          )}

          {/* Planning tips */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium mb-1">Planning Tips</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Not all courses are offered every semester — check with your advisor</li>
                  <li>Some courses have prerequisites that must be completed first</li>
                  <li>Plan to complete requirements progressively across semesters</li>
                  <li>Junior seminars should be taken in your junior year</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
