import { useState } from 'react'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { allCourses } from '@/data/allCourses'

interface CourseInfoButtonProps {
  courseCode: string
  courseTitle: string
  courseHours: number
}

export function CourseInfoButton({ courseCode, courseTitle, courseHours }: CourseInfoButtonProps) {
  const [open, setOpen] = useState(false)

  const catalogEntry = allCourses.find((c) => c.code === courseCode)
  const description = catalogEntry?.description

  if (!description) return null

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent border border-transparent hover:border-border transition-colors shrink-0"
        aria-label={`Info about ${courseCode}`}
      >
        <Info className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{courseCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <h3 className="font-semibold">{courseTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <span className="bg-muted px-2 py-1 rounded">{courseHours} credit hours</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
