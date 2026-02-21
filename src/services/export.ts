import { jsPDF } from 'jspdf'
import type { StudentData, ProgramData } from '@/types'
import {
  computeProgress,
  computeProjectedProgress,
  getCategoriesForProgram,
  isElectiveCategory,
  getRemainingCategories,
  generateSemesterPlan,
} from './courses'

// --- CSV Export ---

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportToCSV(studentData: StudentData): string {
  const lines: string[] = []

  lines.push('ENGLISH_ADVISING_EXPORT,v1')
  lines.push(`name,${escapeCSV(studentData.name)}`)
  lines.push(`program,${studentData.program || ''}`)
  lines.push(`expectedGraduation,${studentData.expectedGraduation || ''}`)
  lines.push(`completedCourses,${studentData.completedCourses.join(';')}`)
  lines.push(`plannedCourses,${studentData.plannedCourses.join(';')}`)

  if (studentData.notes) {
    lines.push(`notes,${escapeCSV(studentData.notes)}`)
  }

  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const today = new Date().toISOString().split('T')[0]
  const filename = `English_Plan_${studentData.name?.replace(/\s+/g, '_') || 'Student'}_${today}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return filename
}

// --- PDF Export ---

const BURGUNDY: [number, number, number] = [123, 45, 59]
const GREEN: [number, number, number] = [5, 150, 105]
const BLUE: [number, number, number] = [59, 130, 246]
const GRAY: [number, number, number] = [107, 114, 128]
const DARK: [number, number, number] = [31, 41, 55]

export function generatePdfBlob(
  studentData: StudentData,
  programData: ProgramData
): { blobUrl: string; filename: string } {
  const programId = studentData.program!
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const completedProgress = computeProgress(programId, studentData.completedCourses)
  const projectedProgress = computeProjectedProgress(
    programId,
    studentData.completedCourses,
    studentData.plannedCourses
  )
  const categories = getCategoriesForProgram(programId)

  // --- Header ---
  doc.setFillColor(...BURGUNDY)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('TCU English Department', pageWidth / 2, 12, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${programData.name} — Advising Report`, pageWidth / 2, 20, { align: 'center' })
  y = 36

  // --- Student info ---
  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const infoLeft = [
    studentData.name ? `Student: ${studentData.name}` : '',
    studentData.expectedGraduation ? `Expected Graduation: ${studentData.expectedGraduation}` : '',
  ].filter(Boolean)

  const infoRight = [
    `Date: ${today}`,
  ]

  infoLeft.forEach((line, i) => {
    doc.text(line, margin, y + i * 5)
  })
  infoRight.forEach((line, i) => {
    doc.text(line, pageWidth - margin, y + i * 5, { align: 'right' })
  })
  y += Math.max(infoLeft.length, infoRight.length) * 5 + 4

  // --- Progress ---
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Overall Progress', margin, y)
  y += 5

  // Progress bar
  const barHeight = 5
  doc.setFillColor(229, 231, 235)
  doc.roundedRect(margin, y, contentWidth, barHeight, 2, 2, 'F')
  if (completedProgress.percent > 0) {
    doc.setFillColor(...GREEN)
    doc.roundedRect(margin, y, contentWidth * Math.min(completedProgress.percent, 100) / 100, barHeight, 2, 2, 'F')
  }
  if (projectedProgress.percent > completedProgress.percent) {
    doc.setFillColor(...BLUE)
    const projWidth = contentWidth * Math.min(projectedProgress.percent, 100) / 100
    doc.roundedRect(margin, y, projWidth, barHeight, 2, 2, 'F')
    // Overlay green on top for completed portion
    if (completedProgress.percent > 0) {
      doc.setFillColor(...GREEN)
      doc.roundedRect(margin, y, contentWidth * Math.min(completedProgress.percent, 100) / 100, barHeight, 2, 2, 'F')
    }
  }
  y += barHeight + 3

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  const plannedHours = projectedProgress.completedHours - completedProgress.completedHours
  let progressText = `${completedProgress.completedHours} of ${projectedProgress.totalHours} hours completed (${completedProgress.percent}%)`
  if (plannedHours > 0) {
    progressText += ` • +${plannedHours} planned (${projectedProgress.percent}% projected)`
  }
  doc.text(progressText, margin, y)
  y += 8

  // --- Category Breakdown ---
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Requirements by Category', margin, y)
  y += 6

  for (const { key, category } of categories) {
    const isElective = isElectiveCategory(category)
    const completedCat = completedProgress.byCategory[key]
    const projectedCat = projectedProgress.byCategory[key]

    // Check page overflow
    if (y > 250) {
      doc.addPage()
      y = margin
    }

    // Category header
    doc.setFillColor(249, 250, 251)
    doc.rect(margin, y - 3, contentWidth, 7, 'F')
    doc.setDrawColor(...BURGUNDY)
    doc.setLineWidth(0.8)
    doc.line(margin, y - 3, margin, y + 4)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(category.name, margin + 3, y + 1)

    const catStatus = `${completedCat?.completed ?? 0}/${category.hours} hrs`
    const plannedInCat = (projectedCat?.completed ?? 0) - (completedCat?.completed ?? 0)
    const statusText = plannedInCat > 0 ? `${catStatus} +${plannedInCat} planned` : catStatus

    const isCatComplete = (projectedCat?.completed ?? 0) >= category.hours
    doc.setTextColor(isCatComplete ? GREEN[0] : GRAY[0], isCatComplete ? GREEN[1] : GRAY[1], isCatComplete ? GREEN[2] : GRAY[2])
    doc.setFont('helvetica', 'normal')
    doc.text(statusText, pageWidth - margin - 2, y + 1, { align: 'right' })
    y += 7

    // Completed courses in this category
    if (!isElective) {
      const completedInCat = category.courses.filter((c) =>
        studentData.completedCourses.includes(c.code)
      )
      const plannedInCatCourses = category.courses.filter((c) =>
        studentData.plannedCourses.includes(c.code)
      )

      for (const course of completedInCat) {
        if (y > 260) { doc.addPage(); y = margin }
        doc.setFontSize(8)
        doc.setTextColor(...GREEN)
        doc.text('✓', margin + 4, y)
        doc.setTextColor(...DARK)
        doc.text(`${course.code}  ${course.title}`, margin + 9, y)
        y += 4
      }

      for (const course of plannedInCatCourses) {
        if (y > 260) { doc.addPage(); y = margin }
        doc.setFontSize(8)
        doc.setTextColor(...BLUE)
        doc.text('→', margin + 4, y)
        doc.setTextColor(...DARK)
        doc.text(`${course.code}  ${course.title}`, margin + 9, y)
        y += 4
      }

      if (completedInCat.length === 0 && plannedInCatCourses.length === 0) {
        doc.setFontSize(8)
        doc.setTextColor(...GRAY)
        doc.text('No courses selected', margin + 9, y)
        y += 4
      }
    } else {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(`Elective courses from department catalog`, margin + 9, y)
      y += 4
    }

    y += 2
  }

  // --- Semester Plan ---
  if (studentData.expectedGraduation) {
    const remaining = getRemainingCategories(
      programId,
      studentData.completedCourses,
      studentData.plannedCourses
    )
    const plan = generateSemesterPlan(studentData.expectedGraduation, remaining)

    if (plan.length > 0) {
      if (y > 230) { doc.addPage(); y = margin }

      y += 4
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text('Suggested Semester Plan', margin, y)
      y += 6

      for (const sem of plan) {
        if (y > 250) { doc.addPage(); y = margin }
        const totalHrs = sem.categories.reduce((s, c) => s + c.hoursNeeded, 0)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BURGUNDY)
        doc.text(`${sem.semester} (${totalHrs} hrs)`, margin + 2, y)
        y += 4

        for (const cat of sem.categories) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...DARK)
          doc.text(`${cat.name} — ${cat.hoursNeeded} hrs`, margin + 6, y)
          y += 3.5
        }
        y += 2
      }
    }
  }

  // --- Notes ---
  if (studentData.notes) {
    if (y > 240) { doc.addPage(); y = margin }

    y += 4
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Notes & Questions', margin, y)
    y += 5

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    const noteLines = doc.splitTextToSize(studentData.notes, contentWidth - 4)
    doc.text(noteLines, margin + 2, y)
    y += noteLines.length * 4
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 10
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(
    `Generated ${today} — For planning purposes only. Use Stellic for official degree auditing.`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  // Generate blob
  const pdfBlob = doc.output('blob')
  const blobUrl = URL.createObjectURL(pdfBlob)
  const todayISO = new Date().toISOString().split('T')[0]
  const filename = `English_Plan_${studentData.name?.replace(/\s+/g, '_') || 'Student'}_${todayISO}.pdf`

  return { blobUrl, filename }
}

export function downloadPdf(blobUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
