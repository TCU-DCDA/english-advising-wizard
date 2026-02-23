# Phase C — SemesterStep ("Coming Semester")

## Goal
Build the blue-themed SemesterStep where students select courses for their coming semester. Same accordion layout as CompletedCoursesStep, but completed courses are locked, prerequisite checks are enforced, and progress shows projected totals (completed + planned).

## Files to Create/Modify

### 1. `src/hooks/useStudentData.ts` — Add `togglePlannedCourse`
- Add `togglePlannedCourse(courseCode: string)` callback (mirrors `toggleCompletedCourse`)
- Current `setPlannedCourses` replaces the whole array; we need a toggle for individual courses

### 2. `src/services/courses.ts` — Add helpers
- `computeProjectedProgress(programId, completedCourses, plannedCourses)` — same as `computeProgress` but combines both arrays for the total
- `checkPrerequisites(courseCode, completedCourses, plannedCourses)` — returns `{ met: boolean, required: string[] }` for UI display (replaces old `alert()` approach with inline warnings)
- `getLowerDivisionHours` — already exists, no change needed (can pass `[...completed, ...planned]`)

### 3. `src/components/wizard/steps/SemesterStep.tsx` — New component
Props: `programId, completedCourses, plannedCourses, onToggleCourse`

**Blue progress hero** (top):
- Blue-50 bg, shows projected progress (completed + planned hours)
- "X / Y hrs completed • +Z planned"
- Lower-division badge counting both completed + planned

**Instruction banner**:
- Blue-50, "Select courses you plan to take next semester. Completed courses are locked."

**Category accordions** (same pattern as CompletedCoursesStep):
- Each category shows completed + planned progress
- **Completed courses**: shown but locked — green badge, dimmed checkbox, "Completed" tag
- **Available courses**: toggleable with blue styling when selected
  - Blue left accent bar, blue code badge (not primary/burgundy)
- **Prerequisite check**: when a course has prerequisites (from prerequisites.json), show amber inline warning if none are met. Don't block selection — just warn (matches DCDA pattern of informing, not blocking)
- Elective categories: same `getElectiveCourses()` approach with search
- Search on categories with 10+ courses

**Course card states**:
- Completed: `border-green-300 bg-green-50`, green left bar, disabled checkbox, "Completed" badge
- Planned: `border-blue-500 bg-blue-50`, blue left bar, blue code badge
- Available: `border-border bg-card hover:border-blue-300`

### 4. `src/App.tsx` — Wire the step
- Import SemesterStep, destructure `togglePlannedCourse` from `useStudentData`
- Add `case 'semester'` in `renderStep()` switch
- Pass `programId, completedCourses, plannedCourses, onToggleCourse: togglePlannedCourse`

### 5. `src/components/wizard/steps/index.ts` — Add export

## Key Differences from CompletedCoursesStep
| Aspect | CompletedCoursesStep | SemesterStep |
|--------|---------------------|--------------|
| Theme | Green | Blue |
| Toggles | `completedCourses` | `plannedCourses` |
| Locked courses | None | Completed courses (locked green) |
| Prerequisites | Not checked | Inline amber warnings |
| Progress | Completed only | Completed + Planned |
| Accent color | Primary (burgundy) | Blue |
