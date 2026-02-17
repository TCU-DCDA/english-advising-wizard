import { useState, useEffect, useCallback } from 'react'
import type { StudentData } from '@/types'

const STORAGE_KEY = 'english-wizard-student-data'

const defaultStudentData: StudentData = {
  name: '',
  program: null,
  expectedGraduation: null,
  totalCreditHours: 0,
  completedCourses: [],
  plannedCourses: [],
  futureCourses: {},
  notes: '',
}

export function useStudentData() {
  const [studentData, setStudentData] = useState<StudentData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as StudentData
      }
    } catch (error) {
      console.error('Failed to load student data:', error)
    }
    return defaultStudentData
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(studentData))
    } catch (error) {
      console.error('Failed to save student data:', error)
    }
  }, [studentData])

  const updateStudentData = useCallback((updates: Partial<StudentData>) => {
    setStudentData((prev) => ({ ...prev, ...updates }))
  }, [])

  const toggleCompletedCourse = useCallback((courseCode: string) => {
    setStudentData((prev) => {
      const adding = !prev.completedCourses.includes(courseCode)
      return {
        ...prev,
        completedCourses: adding
          ? [...prev.completedCourses, courseCode]
          : prev.completedCourses.filter((c) => c !== courseCode),
        // Remove from planned when marking as completed
        plannedCourses: adding
          ? prev.plannedCourses.filter((c) => c !== courseCode)
          : prev.plannedCourses,
      }
    })
  }, [])

  const togglePlannedCourse = useCallback((courseCode: string) => {
    setStudentData((prev) => {
      const adding = !prev.plannedCourses.includes(courseCode)
      return {
        ...prev,
        plannedCourses: adding
          ? [...prev.plannedCourses, courseCode]
          : prev.plannedCourses.filter((c) => c !== courseCode),
        // Remove from completed when marking as planned
        completedCourses: adding
          ? prev.completedCourses.filter((c) => c !== courseCode)
          : prev.completedCourses,
      }
    })
  }, [])

  const setPlannedCourses = useCallback((courses: string[]) => {
    setStudentData((prev) => ({
      ...prev,
      plannedCourses: courses,
    }))
  }, [])

  const updateFutureCourses = useCallback((semester: string, courses: string[]) => {
    setStudentData((prev) => ({
      ...prev,
      futureCourses: {
        ...prev.futureCourses,
        [semester]: courses,
      },
    }))
  }, [])

  const resetStudentData = useCallback(() => {
    setStudentData(defaultStudentData)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    studentData,
    updateStudentData,
    toggleCompletedCourse,
    togglePlannedCourse,
    setPlannedCourses,
    updateFutureCourses,
    resetStudentData,
  }
}
