import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Eye,
  Printer,
  Download,
  Mail,
  Send,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Phone,
  MapPin,
} from 'lucide-react'
import type { StudentData, ProgramData } from '@/types'
import { exportToCSV, generatePdfBlob, downloadPdf } from '@/services/export'
import contactsData from '@/data/contacts.json'

const advisor = contactsData.find((c) => c.role === 'Academic Advisor') ?? contactsData[0]

interface ReviewActionsStepProps {
  studentData: StudentData
  programData: ProgramData
  updateStudentData: (updates: Partial<StudentData>) => void
  resetStudentData: () => void
  onRestart: () => void
}

export function ReviewActionsStep({
  studentData,
  programData,
  updateStudentData,
  resetStudentData,
  onRestart,
}: ReviewActionsStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitFilename, setSubmitFilename] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const isMobile =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // Cleanup blob URL to prevent memory leaks
  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handlePreview = useCallback(() => {
    revokePreviewUrl()
    const { blobUrl, filename } = generatePdfBlob(studentData, programData)
    setPreviewUrl(blobUrl)
    setPreviewFilename(filename)
  }, [studentData, programData, revokePreviewUrl])

  const handleClosePreview = useCallback(() => {
    revokePreviewUrl()
    setPreviewUrl(null)
  }, [revokePreviewUrl])

  const handlePrint = () => {
    const { blobUrl } = generatePdfBlob(studentData, programData)
    const printWindow = window.open(blobUrl)
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print()
        URL.revokeObjectURL(blobUrl)
      })
    }
  }

  const handleDownloadCsv = () => {
    exportToCSV(studentData)
  }

  const handleDownloadPdf = () => {
    if (previewUrl) {
      downloadPdf(previewUrl, previewFilename)
    }
  }

  const handleSubmitToAdvisor = () => {
    const filename = exportToCSV(studentData)
    setSubmitFilename(filename)
    setShowSubmitConfirm(true)
  }

  const handleOpenEmail = () => {
    const date = new Date().toLocaleDateString()
    const subject = `English Advising Plan: ${studentData.name || 'Student'}`
    const body = `English Department Advising Plan

Student: ${studentData.name || 'Not specified'}
Program: ${programData.name}
Expected Graduation: ${studentData.expectedGraduation || 'Not specified'}
Date: ${date}

Notes/Questions:
${studentData.notes || 'None'}

---
Advising plan CSV attached.
Submitted via TCU English Advising Wizard`

    const mailtoUrl = `mailto:${advisor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    setShowSubmitConfirm(false)
  }

  const handleReset = () => {
    resetStudentData()
    onRestart()
    setShowResetConfirm(false)
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Save & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Schedule an appointment, add notes, and submit your plan.
        </p>
      </div>

      {/* 1. Advisor contact */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-primary text-lg">Contact Your Advisor</h3>
        <div className="space-y-2 text-sm">
          <div className="font-medium text-foreground">{advisor.name}</div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <a href={`mailto:${advisor.email}`} className="underline underline-offset-2">
              {advisor.email}
            </a>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-3.5 shrink-0" />
            <span>{advisor.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span>{advisor.office}</span>
          </div>
        </div>
        <Button asChild className="w-full" size="lg">
          <a
            href={`mailto:${advisor.email}?subject=${encodeURIComponent(`Advising Appointment Request: ${studentData.name || 'Student'}`)}`}
          >
            <Mail className="size-5 mr-2" />
            Schedule an Appointment
          </a>
        </Button>
      </div>

      {/* 2. Notes */}
      <div className="space-y-3">
        <label htmlFor="notes" className="text-sm font-semibold block px-1">
          Notes or Questions for Advisor
        </label>
        <Textarea
          id="notes"
          placeholder="Add any questions about transfer credits, courses, or career goals..."
          value={studentData.notes || ''}
          onChange={(e) => updateStudentData({ notes: e.target.value })}
          className="text-base"
        />
      </div>

      {/* 3. Submit — primary action */}
      <Button className="w-full gap-2" size="lg" onClick={handleSubmitToAdvisor}>
        <Send className="size-5" />
        Submit Plan to Advisor
      </Button>
      <p className="text-xs text-muted-foreground text-center -mt-3">
        Downloads your plan as CSV and opens an email to your advisor.
      </p>

      {/* 4. More export options — collapsed */}
      <div className="border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExportOptions(!showExportOptions)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span>More export options</span>
          {showExportOptions ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {showExportOptions && (
          <div className="grid grid-cols-2 gap-3 p-4 pt-0 border-t">
            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-1.5"
              onClick={handlePreview}
            >
              <Eye className="size-4" />
              <span className="text-xs">Preview PDF</span>
            </Button>

            {!isMobile && (
              <Button
                variant="outline"
                className="flex-col h-auto py-3 gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                <span className="text-xs">Print PDF</span>
              </Button>
            )}

            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-1.5"
              onClick={handleDownloadCsv}
            >
              <Download className="size-4" />
              <span className="text-xs">Save CSV</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 text-sm text-muted-foreground px-1">
        <Mail className="size-4 mt-0.5 shrink-0" />
        <p>
          <strong>Tip:</strong> Save your PDF or CSV and email it before your
          meeting so your advisor can review it in advance.
        </p>
      </div>

      {/* Start Over */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          Start Over
        </button>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Plan Downloaded</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your advising plan has been saved as:
            </p>
            <div className="bg-muted rounded-lg px-3 py-2 text-sm font-mono break-all">
              {submitFilename}
            </div>
            <p className="text-sm text-muted-foreground">
              An email will open next. Please{' '}
              <strong>attach the downloaded file</strong> before sending.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleOpenEmail} className="flex-1 gap-2">
                <Mail className="size-4" />
                Open Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && handleClosePreview()}
      >
        <DialogContent className="max-w-full sm:max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>PDF Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
          <div className="p-4 pt-0 flex gap-2">
            <Button
              variant="secondary"
              onClick={handleClosePreview}
              className="flex-1"
            >
              Close
            </Button>
            <Button onClick={handleDownloadPdf} className="flex-1">
              <Download className="size-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Over?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will clear all your selections and return to the beginning.
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                className="flex-1 gap-2"
              >
                <RotateCcw className="size-4" />
                Start Over
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
