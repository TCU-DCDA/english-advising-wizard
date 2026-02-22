import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStudentData } from '../useStudentData'

const STORAGE_KEY = 'english-wizard-student-data'

beforeEach(() => {
  localStorage.clear()
})

describe('useStudentData', () => {
  describe('initialization', () => {
    it('returns default state when localStorage is empty', () => {
      const { result } = renderHook(() => useStudentData())
      expect(result.current.studentData.name).toBe('')
      expect(result.current.studentData.program).toBeNull()
      expect(result.current.studentData.completedCourses).toEqual([])
      expect(result.current.studentData.plannedCourses).toEqual([])
      expect(result.current.studentData.notYetCategories).toEqual([])
    })

    it('restores state from localStorage', () => {
      const stored = {
        name: 'Jane',
        program: 'english',
        expectedGraduation: null,
        completedCourses: ['ENGL 20503'],
        plannedCourses: [],
        notYetCategories: [],
        notes: '',
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

      const { result } = renderHook(() => useStudentData())
      expect(result.current.studentData.name).toBe('Jane')
      expect(result.current.studentData.program).toBe('english')
      expect(result.current.studentData.completedCourses).toEqual(['ENGL 20503'])
    })

    it('migrates legacy data without notYetCategories', () => {
      const stored = {
        name: 'Jane',
        program: 'english',
        expectedGraduation: null,
        completedCourses: ['ENGL 20503'],
        plannedCourses: [],
        notes: '',
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

      const { result } = renderHook(() => useStudentData())
      expect(result.current.studentData.notYetCategories).toEqual([])
    })
  })

  describe('updateStudentData', () => {
    it('merges partial updates', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.updateStudentData({ name: 'Jane', program: 'english' })
      })

      expect(result.current.studentData.name).toBe('Jane')
      expect(result.current.studentData.program).toBe('english')
      // Other fields unchanged
      expect(result.current.studentData.completedCourses).toEqual([])
    })
  })

  describe('toggleCompletedCourse', () => {
    it('adds a course to completed', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleCompletedCourse('ENGL 20503')
      })

      expect(result.current.studentData.completedCourses).toContain('ENGL 20503')
    })

    it('removes a course from completed on second toggle', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleCompletedCourse('ENGL 20503')
      })
      act(() => {
        result.current.toggleCompletedCourse('ENGL 20503')
      })

      expect(result.current.studentData.completedCourses).not.toContain('ENGL 20503')
    })

    it('removes from planned when adding to completed', () => {
      const { result } = renderHook(() => useStudentData())

      // First add to planned
      act(() => {
        result.current.togglePlannedCourse('ENGL 20503')
      })
      expect(result.current.studentData.plannedCourses).toContain('ENGL 20503')

      // Now mark as completed — should remove from planned
      act(() => {
        result.current.toggleCompletedCourse('ENGL 20503')
      })
      expect(result.current.studentData.completedCourses).toContain('ENGL 20503')
      expect(result.current.studentData.plannedCourses).not.toContain('ENGL 20503')
    })
  })

  describe('togglePlannedCourse', () => {
    it('adds a course to planned', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.togglePlannedCourse('ENGL 30133')
      })

      expect(result.current.studentData.plannedCourses).toContain('ENGL 30133')
    })

    it('removes from completed when adding to planned', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleCompletedCourse('ENGL 30133')
      })
      expect(result.current.studentData.completedCourses).toContain('ENGL 30133')

      act(() => {
        result.current.togglePlannedCourse('ENGL 30133')
      })
      expect(result.current.studentData.plannedCourses).toContain('ENGL 30133')
      expect(result.current.studentData.completedCourses).not.toContain('ENGL 30133')
    })
  })

  describe('setPlannedCourses', () => {
    it('batch sets planned courses', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.setPlannedCourses(['ENGL 30133', 'ENGL 30143'])
      })

      expect(result.current.studentData.plannedCourses).toEqual(['ENGL 30133', 'ENGL 30143'])
    })
  })

  describe('toggleNotYetCategory', () => {
    it('adds a category to notYetCategories', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleNotYetCategory('americanLit', ['ENGL 20503', 'ENGL 30133'])
      })

      expect(result.current.studentData.notYetCategories).toContain('americanLit')
    })

    it('removes completed courses in category when marking not yet', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleCompletedCourse('ENGL 20503')
      })
      expect(result.current.studentData.completedCourses).toContain('ENGL 20503')

      act(() => {
        result.current.toggleNotYetCategory('americanLit', ['ENGL 20503', 'ENGL 30133'])
      })

      expect(result.current.studentData.completedCourses).not.toContain('ENGL 20503')
      expect(result.current.studentData.notYetCategories).toContain('americanLit')
    })

    it('toggles off when called again', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleNotYetCategory('americanLit', [])
      })
      expect(result.current.studentData.notYetCategories).toContain('americanLit')

      act(() => {
        result.current.toggleNotYetCategory('americanLit', [])
      })
      expect(result.current.studentData.notYetCategories).not.toContain('americanLit')
    })
  })

  describe('clearNotYetCategory', () => {
    it('removes a category from notYetCategories', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.toggleNotYetCategory('britishLit', [])
      })
      expect(result.current.studentData.notYetCategories).toContain('britishLit')

      act(() => {
        result.current.clearNotYetCategory('britishLit')
      })
      expect(result.current.studentData.notYetCategories).not.toContain('britishLit')
    })
  })

  describe('resetStudentData', () => {
    it('returns to default state', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.updateStudentData({ name: 'Jane', program: 'english' })
        result.current.toggleCompletedCourse('ENGL 20503')
      })

      act(() => {
        result.current.resetStudentData()
      })

      expect(result.current.studentData.name).toBe('')
      expect(result.current.studentData.program).toBeNull()
      expect(result.current.studentData.completedCourses).toEqual([])
    })
  })

  describe('localStorage persistence', () => {
    it('persists updates to localStorage', () => {
      const { result } = renderHook(() => useStudentData())

      act(() => {
        result.current.updateStudentData({ name: 'Jane' })
      })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored.name).toBe('Jane')
    })
  })
})
