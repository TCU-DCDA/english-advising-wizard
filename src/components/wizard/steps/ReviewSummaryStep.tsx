import { useMemo } from 'react'
import { CheckCircle, Circle, CalendarDays, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getProgram,
  getCategoriesForProgram,
  computeProgress,
  computeProjectedProgress,
  getLowerDivisionHours,
  isElectiveCategory,
  getRemainingCategories,
  generateSemesterPlan,
} from '@/services/courses'
import type { ProgramId } from '@/types'

interface ReviewSummaryStepProps {
  programId: ProgramId
  completedCourses: string[]
  plannedCourses: string[]
  expectedGraduation: string | null
}

export function ReviewSummaryStep({
  programId,
  completedCourses,
  plannedCourses,
  expectedGraduation,
}: ReviewSummaryStepProps) {
  const program = getProgram(programId)
  const categories = getCategoriesForProgram(programId)
  const completedProgress = computeProgress(programId, completedCourses)
  const projectedProgress = computeProjectedProgress(programId, completedCourses, plannedCourses)
  const combinedCourses = useMemo(
    () => [...new Set([...completedCourses, ...plannedCourses])],
    [completedCourses, plannedCourses]
  )
  const lowerDivHours = getLowerDivisionHours(combinedCourses, programId)
  const maxLowerDiv = program.maxLowerDivision ?? 0
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
      {/* Progress hero */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-primary">
            {program.name}
          </h2>
          <span className="text-sm font-medium text-primary/80">
            {completedProgress.completedHours} / {projectedProgress.totalHours} hrs
            {plannedHours > 0 && (
              <span className="ml-1 text-blue-600">+{plannedHours} planned</span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-primary/10 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full relative">
            {projectedProgress.percent > completedProgress.percent && (
              <div
                className="absolute inset-y-0 left-0 bg-blue-400 rounded-full transition-all duration-400"
                style={{ width: `${Math.min(projectedProgress.percent, 100)}%` }}
              />
            )}
            <div
              className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-400"
              style={{ width: `${Math.min(completedProgress.percent, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-primary/70">
          <span>
            {completedProgress.percent}% completed
            {plannedHours > 0 && ` \u2022 ${projectedProgress.percent}% projected`}
          </span>
          {maxLowerDiv > 0 && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full font-medium',
                lowerDivHours > maxLowerDiv
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  : 'bg-primary/10 text-primary/80'
              )}
            >
              {lowerDivHours} / {maxLowerDiv} lower-div hrs
            </span>
          )}
        </div>
      </div>

      {/* Lower-division warning */}
      {maxLowerDiv > 0 && lowerDivHours > maxLowerDiv && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Lower-division hours ({lowerDivHours}) exceed the {maxLowerDiv}-hour maximum for {program.name}.
          </p>
        </div>
      )}

      {/* Category audit */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Degree Audit</h3>

        {categories.map(({ key, category }) => {
          const isElective = isElectiveCategory(category)
          const completedCat = completedProgress.byCategory[key]
          const projectedCat = projectedProgress.byCategory[key]
          const isCatComplete = projectedCat && projectedCat.completed >= projectedCat.required
          const completedHrsInCat = completedCat?.completed ?? 0
          const projectedHrsInCat = projectedCat?.completed ?? 0
          const plannedHrsInCat = projectedHrsInCat - completedHrsInCat

          // Get courses for this category
          const completedInCat = !isElective
            ? category.courses.filter((c) => completedCourses.includes(c.code))
            : []
          const plannedInCat = !isElective
            ? category.courses.filter((c) => plannedCourses.includes(c.code))
            : []

          return (
            <div
              key={key}
              className={cn(
                'border rounded-lg p-3',
                isCatComplete ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20' : ''
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {isCatComplete ? (
                  <CheckCircle className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <Circle className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-medium text-sm text-foreground flex-1">{category.name}</span>
                <span className="text-xs text-muted-foreground">
                  {completedHrsInCat}/{category.hours} hrs
                  {plannedHrsInCat > 0 && (
                    <span className="text-blue-600 dark:text-blue-400"> +{plannedHrsInCat}</span>
                  )}
                </span>
              </div>

              {/* Course list (non-elective only) */}
              {!isElective && (completedInCat.length > 0 || plannedInCat.length > 0) && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {completedInCat.map((c) => (
                    <div key={c.code} className="flex items-center gap-2 text-xs">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span className="font-mono text-primary/70">{c.code}</span>
                      <span className="text-muted-foreground truncate">{c.title}</span>
                    </div>
                  ))}
                  {plannedInCat.map((c) => (
                    <div key={c.code} className="flex items-center gap-2 text-xs">
                      <span className="text-blue-600 dark:text-blue-400">→</span>
                      <span className="font-mono text-primary/70">{c.code}</span>
                      <span className="text-muted-foreground truncate">{c.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Elective summary */}
              {isElective && (completedHrsInCat > 0 || plannedHrsInCat > 0) && (
                <p className="ml-6 mt-1 text-xs text-muted-foreground">
                  Elective courses from department catalog
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Coming semester summary */}
      {plannedCourses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarDays className="size-4 text-blue-600" />
            Coming Semester ({plannedHours} hrs planned)
          </h3>
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="space-y-1">
              {plannedCourses.map((code) => {
                // Find course info from categories
                let title = code
                for (const { category } of categories) {
                  const found = category.courses.find((c) => c.code === code)
                  if (found) {
                    title = found.title
                    break
                  }
                }
                return (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600 dark:text-blue-400">→</span>
                    <span className="font-mono text-primary/70">{code}</span>
                    <span className="text-muted-foreground truncate">{title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Future plan */}
      {semesterPlan.length > 0 && expectedGraduation && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <CalendarDays className="size-4 text-purple-600" />
            Path to {expectedGraduation}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {semesterPlan.map((sem) => {
              const totalHrs = sem.categories.reduce((s, c) => s + c.hoursNeeded, 0)
              return (
                <div
                  key={sem.semester}
                  className="border border-purple-200 dark:border-purple-800 rounded-lg p-2.5 bg-purple-50/50 dark:bg-purple-950/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
                      {sem.semester}
                    </span>
                    <span className="text-xs text-purple-600 dark:text-purple-400">{totalHrs} hrs</span>
                  </div>
                  {sem.categories.map((cat) => (
                    <div key={cat.key} className="text-xs text-foreground/70 truncate">
                      {cat.name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
