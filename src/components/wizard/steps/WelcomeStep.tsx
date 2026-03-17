import { useState } from 'react'
import { BookOpen, CheckSquare, Calendar, GitBranch, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const PHASES = [
  {
    icon: BookOpen,
    title: 'Choose Your Program',
    description: 'Select your major and target graduation',
  },
  {
    icon: CheckSquare,
    title: 'Record Completed Courses',
    description: 'Check off what you\'ve already taken',
  },
  {
    icon: Calendar,
    title: 'Plan Next Semester',
    description: 'Pick courses for the coming term',
  },
  {
    icon: GitBranch,
    title: 'Map Your Future',
    description: 'Plan remaining semesters to graduation',
  },
  {
    icon: FileText,
    title: 'Review & Submit',
    description: 'See your degree audit and share with advisor',
  },
]

export function WelcomeStep() {
  const [showFerpa, setShowFerpa] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to English Advising</h2>
        <p className="text-sm text-muted-foreground">
          Plan your degree in English, Writing &amp; Rhetoric, or Creative Writing
          with this step-by-step advising tool.
        </p>
      </div>

      {/* Phase overview */}
      <div className="space-y-2">
        {PHASES.map((phase, i) => (
          <div
            key={phase.title}
            className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{phase.title}</p>
              <p className="text-xs text-muted-foreground">{phase.description}</p>
            </div>
            <phase.icon className="w-5 h-5 shrink-0 text-muted-foreground/50" />
          </div>
        ))}
      </div>

      {/* Advisory note + privacy */}
      <p className="text-sm text-muted-foreground text-center">
        This tool is for <strong>planning purposes only.</strong> Always work with
        your (human!) advisor to discuss your degree plan. This tool stores your
        plan in your browser on this device and sends limited anonymous usage and
        planning analytics to Firebase-hosted services managed by the project team
        for this pilot (
        <button
          type="button"
          onClick={() => setShowFerpa(true)}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          privacy notice
        </button>
        ).
      </p>

      {/* FERPA Dialog */}
      <Dialog open={showFerpa} onOpenChange={setShowFerpa}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>FERPA Privacy Notice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This planning tool stores your plan in your browser on this device. For
            development, testing, and limited pilot use, it sends limited anonymous
            usage and planning analytics to Firebase-hosted services managed by the
            project team. If you use the AI assistant, your messages and relevant
            planning context (such as selected courses and program) are sent to the
            assistant service and may be logged for quality and safety review. Do not
            include personal identifiers (for example TCU ID, SSN, or financial/medical
            details). Any broader institutional deployment is contingent on formal TCU
            privacy/security/legal review and implementation on TCU-approved
            infrastructure and controls. This tool supports planning and is not the
            official student record system.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
