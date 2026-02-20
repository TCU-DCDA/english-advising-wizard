import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportToCSV } from '../export'
import type { StudentData } from '@/types'

let capturedBlobContent = ''
const OriginalBlob = globalThis.Blob

beforeEach(() => {
  capturedBlobContent = ''

  // Replace Blob constructor to capture CSV content
  vi.stubGlobal('Blob', class MockBlob {
    constructor(parts: BlobPart[]) {
      capturedBlobContent = parts[0] as string
    }
  })

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

  const mockLink = {
    href: '',
    download: '',
    click: vi.fn(),
  }
  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
})

afterEach(() => {
  vi.stubGlobal('Blob', OriginalBlob)
  vi.restoreAllMocks()
})

function makeStudentData(overrides: Partial<StudentData> = {}): StudentData {
  return {
    name: 'Jane Doe',
    program: 'english',
    expectedGraduation: 'Spring 2027',
    totalCreditHours: 45,
    completedCourses: ['ENGL 20503', 'ENGL 20403'],
    plannedCourses: ['ENGL 30133'],
    notes: '',
    ...overrides,
  }
}

describe('exportToCSV', () => {
  it('returns a filename with student name and date', () => {
    const filename = exportToCSV(makeStudentData())
    expect(filename).toMatch(/^English_Plan_Jane_Doe_\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('uses "Student" when name is empty', () => {
    const filename = exportToCSV(makeStudentData({ name: '' }))
    expect(filename).toMatch(/^English_Plan_Student_/)
  })

  it('creates correct CSV structure', () => {
    exportToCSV(makeStudentData())

    const lines = capturedBlobContent.split('\n')
    expect(lines[0]).toBe('ENGLISH_ADVISING_EXPORT,v1')
    expect(lines[1]).toBe('name,Jane Doe')
    expect(lines[2]).toBe('program,english')
    expect(lines[3]).toBe('expectedGraduation,Spring 2027')
    expect(lines[4]).toBe('totalCreditHours,45')
    expect(lines[5]).toBe('completedCourses,ENGL 20503;ENGL 20403')
    expect(lines[6]).toBe('plannedCourses,ENGL 30133')
  })

  it('escapes CSV values with commas', () => {
    exportToCSV(makeStudentData({ name: 'Doe, Jane' }))

    const lines = capturedBlobContent.split('\n')
    expect(lines[1]).toBe('name,"Doe, Jane"')
  })

  it('escapes CSV values with quotes', () => {
    exportToCSV(makeStudentData({ name: 'Jane "JD" Doe' }))

    const lines = capturedBlobContent.split('\n')
    expect(lines[1]).toBe('name,"Jane ""JD"" Doe"')
  })

  it('includes notes when present', () => {
    exportToCSV(makeStudentData({ notes: 'Ask about minor' }))

    expect(capturedBlobContent).toContain('notes,Ask about minor')
  })

  it('omits notes line when notes is empty', () => {
    exportToCSV(makeStudentData({ notes: '' }))

    expect(capturedBlobContent).not.toContain('notes,')
  })
})
