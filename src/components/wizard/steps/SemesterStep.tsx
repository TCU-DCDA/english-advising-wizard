import { useState, useMemo } from 'react'
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Search,
  Info,
  AlertTriangle,
  CalendarDays,
  Lock,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getProgram,
  getCategoriesForProgram,
  computeProgress,
  computeProjectedProgress,
  getLowerDivisionHours,
  isElectiveCategory,
  getElectiveCourses,
  checkPrerequisites,
} from '@/services/courses'
import type { ProgramId, Course } from '@/types'
import type { CatalogCourse } from '@/data/allCourses'

interface SemesterStepProps {
  programId: ProgramId
  completedCourses: string[]
  plannedCourses: string[]
  onToggleCourse: (code: string) => void
}

export function SemesterStep({
  programId,
  completedCourses,
  plannedCourses,
  onToggleCourse,
}: SemesterStepProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})

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

  const electiveCourses = useMemo(
    () => getElectiveCourses(programId),
    [programId]
  )

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const setSearch = (key: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [key]: query }))
  }

  const plannedHours = projectedProgress.completedHours - completedProgress.completedHours

  return (
    <div className="space-y-5">
      {/* Semester context banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl">
        <CalendarDays className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Coming Semester
          </div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">
            Select courses you plan to take next semester. Completed courses are locked.
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {program.name}
          </h2>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {completedProgress.completedHours} / {projectedProgress.totalHours} hrs
            {plannedHours > 0 && (
              <span className="ml-1 text-blue-500">+{plannedHours} planned</span>
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden mb-3">
          {/* Completed portion */}
          <div className="h-full rounded-full relative">
            <div
              className="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-400 rounded-full transition-all duration-400"
              style={{ width: `${Math.min(completedProgress.percent, 100)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-400"
              style={{ width: `${Math.min(projectedProgress.percent, 100)}%`, opacity: 0.5 }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400">
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
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-400'
              )}
            >
              {lowerDivHours} / {maxLowerDiv} lower-div hrs
              {lowerDivHours > maxLowerDiv && ' \u2014 over limit'}
            </span>
          )}
        </div>
      </div>

      {/* Lower-division warning */}
      {maxLowerDiv > 0 && lowerDivHours > maxLowerDiv && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You've selected <strong>{lowerDivHours} hours</strong> of lower-division courses
            (completed + planned). {program.name} allows a maximum of{' '}
            <strong>{maxLowerDiv} hours</strong>.
          </p>
        </div>
      )}

      {/* Category Accordions */}
      <div className="space-y-3">
        {categories.map(({ key, category }) => {
          const isElective = isElectiveCategory(category)
          const completedCat = completedProgress.byCategory[key]
          const projectedCat = projectedProgress.byCategory[key]
          const isComplete = projectedCat && projectedCat.completed >= projectedCat.required
          const isExpanded = expandedCategories.has(key)
          const searchQuery = searchQueries[key] || ''

          // Get courses for this category
          const rawCourses: Array<Course | CatalogCourse> = isElective
            ? electiveCourses
            : category.courses.filter((c) => c.code !== 'ANY')

          // Apply search filter
          const courses = rawCourses.filter((c) => {
            if (!searchQuery) return true
            const q = searchQuery.toLowerCase()
            return (
              c.code.toLowerCase().includes(q) ||
              c.title.toLowerCase().includes(q)
            )
          })

          const showSearch = rawCourses.length > 10
          const completedHrsInCat = completedCat?.completed ?? 0
          const projectedHrsInCat = projectedCat?.completed ?? 0
          const plannedHrsInCat = projectedHrsInCat - completedHrsInCat

          return (
            <div key={key} className="border rounded-xl overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => toggleCategory(key)}
                className={cn(
                  'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                  isComplete
                    ? 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50'
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                {isComplete ? (
                  <CheckCircle className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <Circle className="size-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({completedHrsInCat} / {category.hours} hrs
                    {plannedHrsInCat > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {' '}+{plannedHrsInCat} planned
                      </span>
                    )}
                    )
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Accordion body */}
              {isExpanded && (
                <div className="px-4 py-3 space-y-3">
                  {/* Search input */}
                  {showSearch && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearch(key, e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  )}

                  {/* Elective info note */}
                  {isElective && (
                    <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-2.5">
                      <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Any ENGL, WRIT, or CRWT course can count as an elective.
                        Search to find your course.
                      </p>
                    </div>
                  )}

                  {/* Course list */}
                  {courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery
                        ? `No courses found matching "${searchQuery}"`
                        : 'No courses available'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {courses.map((course) => {
                        const isCompleted = completedCourses.includes(course.code)
                        const isPlanned = plannedCourses.includes(course.code)
                        const isLower = 'level' in course && course.level === 'lower'

                        // Check prerequisites for non-completed courses
                        const prereqCheck = !isCompleted
                          ? checkPrerequisites(course.code, completedCourses, plannedCourses)
                          : null

                        return (
                          <div key={course.code}>
                            <label
                              className={cn(
                                'flex items-stretch rounded-xl border-2 transition-all overflow-hidden',
                                isCompleted
                                  ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 cursor-default'
                                  : isPlanned
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm shadow-blue-500/10 cursor-pointer'
                                    : 'border-border bg-card hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer'
                              )}
                            >
                              {/* Left accent bar */}
                              <div
                                className={cn(
                                  'w-1 shrink-0 transition-colors',
                                  isCompleted
                                    ? 'bg-green-500'
                                    : isPlanned
                                      ? 'bg-blue-500'
                                      : 'bg-transparent'
                                )}
                              />
                              <div className="flex items-center gap-3 p-3 flex-1 min-w-0">
                                {isCompleted ? (
                                  <Lock className="size-4 text-green-500 dark:text-green-400 shrink-0" />
                                ) : (
                                  <Checkbox
                                    checked={isPlanned}
                                    onCheckedChange={() => onToggleCourse(course.code)}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span
                                      className={cn(
                                        'text-xs font-semibold px-2 py-0.5 rounded',
                                        isCompleted
                                          ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40'
                                          : isPlanned
                                            ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40'
                                            : 'text-primary bg-primary/10'
                                      )}
                                    >
                                      {course.code}
                                    </span>
                                    {isCompleted && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                        Completed
                                      </span>
                                    )}
                                    {isLower && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                        Lower Div
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-foreground leading-snug">
                                    {course.title}
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {course.hours} hrs
                                </span>
                              </div>
                            </label>

                            {/* Prerequisite warning */}
                            {prereqCheck && !prereqCheck.met && (isPlanned || !isCompleted) && prereqCheck.required.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 ml-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2.5 py-1.5">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                <span>
                                  Prerequisite needed: {prereqCheck.required.join(' or ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
