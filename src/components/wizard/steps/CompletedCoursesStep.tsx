import { useState, useMemo } from 'react'
import { CheckCircle, Circle, ChevronDown, ChevronUp, Search, Info, AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getProgram,
  getCategoriesForProgram,
  computeProgress,
  getLowerDivisionHours,
  isElectiveCategory,
  getElectiveCourses,
} from '@/services/courses'
import type { ProgramId, Course } from '@/types'
import type { CatalogCourse } from '@/data/allCourses'

interface CompletedCoursesStepProps {
  programId: ProgramId
  completedCourses: string[]
  onToggleCourse: (code: string) => void
}

export function CompletedCoursesStep({
  programId,
  completedCourses,
  onToggleCourse,
}: CompletedCoursesStepProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})

  const program = getProgram(programId)
  const categories = getCategoriesForProgram(programId)
  const progress = computeProgress(programId, completedCourses)
  const lowerDivHours = getLowerDivisionHours(completedCourses, programId)
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

  return (
    <div className="space-y-5">
      {/* Progress Summary */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
            {program.name}
          </h2>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {progress.completedHours} / {progress.totalHours} hrs
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-green-600 dark:bg-green-400 rounded-full transition-all duration-400"
            style={{ width: `${Math.min(progress.percent, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-green-700 dark:text-green-400">
          <span>{progress.percent}% complete</span>
          {maxLowerDiv > 0 && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full font-medium',
                lowerDivHours > maxLowerDiv
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-400'
              )}
            >
              {lowerDivHours} / {maxLowerDiv} lower-div hrs
              {lowerDivHours > maxLowerDiv && ' — over limit'}
            </span>
          )}
        </div>
      </div>

      {/* Instruction note */}
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3">
        <p className="text-sm text-green-800 dark:text-green-300">
          Check the courses you've already completed in each category below.
        </p>
      </div>

      {/* Lower-division warning */}
      {maxLowerDiv > 0 && lowerDivHours > maxLowerDiv && (
        <div role="alert" className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You've selected <strong>{lowerDivHours} hours</strong> of lower-division courses.{' '}
            {program.name} allows a maximum of <strong>{maxLowerDiv} hours</strong>.
            Consider replacing some lower-division selections with upper-division alternatives.
          </p>
        </div>
      )}

      {/* Category Accordions */}
      <div className="space-y-3">
        {categories.map(({ key, category }) => {
          const isElective = isElectiveCategory(category)
          const catProgress = progress.byCategory[key]
          const isComplete = catProgress && catProgress.completed >= catProgress.required
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

          return (
            <div key={key} className="border rounded-xl overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => toggleCategory(key)}
                className={cn(
                  'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                  isComplete
                    ? 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50'
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                {isComplete ? (
                  <CheckCircle className="size-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <Circle className="size-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({catProgress?.completed ?? 0} / {category.hours} hrs)
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
                        const isChecked = completedCourses.includes(course.code)
                        const isLower = 'level' in course && course.level === 'lower'

                        return (
                          <label
                            key={course.code}
                            className={cn(
                              'flex items-stretch rounded-xl border-2 cursor-pointer transition-all overflow-hidden',
                              isChecked
                                ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                                : 'border-border bg-card hover:border-primary/50'
                            )}
                          >
                            {/* Left accent bar */}
                            <div
                              className={cn(
                                'w-1 shrink-0 transition-colors',
                                isChecked ? 'bg-primary' : 'bg-transparent'
                              )}
                            />
                            <div className="flex items-center gap-3 p-3 flex-1 min-w-0">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => onToggleCourse(course.code)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    {course.code}
                                  </span>
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

      {/* Overlay notes (English program only) */}
      {programId === 'english' && <OverlayNotes />}
    </div>
  )
}

function OverlayNotes() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left bg-muted/50 hover:bg-muted transition-colors"
      >
        <Info className="size-5 text-muted-foreground shrink-0" />
        <span className="font-medium flex-1">Additional Requirements</span>
        {isOpen ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Early Literature & Culture (6 hrs)</p>
            <p>
              At least 6 hours must come from courses focused on literature and culture before 1800.
              This is satisfied by courses already counting in other categories (e.g., King Arthur,
              Milton, Chaucer, Renaissance Poetry, Early American Lit).
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Junior Research Seminar (3 hrs)</p>
            <p>
              One 38000-level research seminar is required (e.g., ENGL 38023 or ENGL 38013).
              This counts toward the American or British Literature category.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
