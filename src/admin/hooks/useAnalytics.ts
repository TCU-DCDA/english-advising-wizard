import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

export interface DailyStats {
  date: string
  wizardStarts: number
  wizardCompletions: number
  stepDropoffs: Record<string, number>
  hourlyStarts: Record<string, number>
  exports: Record<string, number>
}

export interface CourseDemand {
  term: string
  scheduled: Record<string, number>
  completed: Record<string, number>
}

export interface SubmissionInsights {
  hasNotesCount: number
  avgDegreeProgress: number
}

export interface StepFunnel {
  stepId: string
  visits: number
}

export interface SubmissionSummary {
  totalSubmissions: number
  byProgram: { english: number; writing: number; creativeWriting: number }
  byGraduation: Record<string, number>
  recentDays: DailyStats[]
  courseDemand: CourseDemand | null
  insights: SubmissionInsights
  stepFunnel: StepFunnel[]
  peakHours: Record<string, number>
  exportCounts: Record<string, number>
}

export function useAnalytics() {
  const [summary, setSummary] = useState<SubmissionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch daily stats (all days, sort client-side, take last 30)
      const dailyRef = collection(db, 'english_analytics', 'daily', 'stats')
      const dailySnap = await getDocs(dailyRef)
      const allDays: DailyStats[] = dailySnap.docs
        .map((d) => ({
          date: d.id,
          wizardStarts: d.data().wizardStarts ?? 0,
          wizardCompletions: d.data().wizardCompletions ?? 0,
          stepDropoffs: d.data().stepDropoffs ?? {},
          hourlyStarts: d.data().hourlyStarts ?? {},
          exports: d.data().exports ?? {},
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
      const recentDays = allDays.slice(0, 30)

      // Aggregate peak hours and export counts across all days
      const peakHours: Record<string, number> = {}
      const exportCounts: Record<string, number> = {}
      for (const day of allDays) {
        for (const [hour, count] of Object.entries(day.hourlyStarts)) {
          peakHours[hour] = (peakHours[hour] || 0) + count
        }
        for (const [method, count] of Object.entries(day.exports)) {
          exportCounts[method] = (exportCounts[method] || 0) + count
        }
      }

      // Aggregate step funnel from stepVisits across all days
      const stepTotals: Record<string, number> = {}
      for (const d of dailySnap.docs) {
        const stepVisits = d.data().stepVisits ?? {}
        for (const [stepId, count] of Object.entries(stepVisits)) {
          stepTotals[stepId] = (stepTotals[stepId] || 0) + (count as number)
        }
      }

      // Fetch submissions for aggregate stats
      const subsRef = collection(db, 'english_submissions')
      const subsSnap = await getDocs(subsRef)
      let english = 0
      let writing = 0
      let creativeWriting = 0
      let hasNotesCount = 0
      let totalProgress = 0
      const byGraduation: Record<string, number> = {}
      subsSnap.docs.forEach((d) => {
        const data = d.data()
        if (data.programId === 'english') english++
        else if (data.programId === 'writing') writing++
        else if (data.programId === 'creativeWriting') creativeWriting++
        const grad = data.expectedGraduation || 'Unknown'
        byGraduation[grad] = (byGraduation[grad] || 0) + 1
        if (data.hasNotes) hasNotesCount++
        if (typeof data.degreeProgressPct === 'number') totalProgress += data.degreeProgressPct
      })

      // Fetch course demand for current term
      const termId = getCurrentTerm()
      let courseDemand: CourseDemand | null = null
      try {
        const demandRef = collection(db, 'english_analytics', 'course_demand', 'terms')
        const demandSnap = await getDocs(demandRef)
        const termDoc = demandSnap.docs.find((d) => d.id === termId)
        if (termDoc) {
          courseDemand = {
            term: termId,
            scheduled: termDoc.data().scheduled ?? {},
            completed: termDoc.data().completed ?? {},
          }
        }
      } catch {
        // Course demand collection may not exist yet
      }

      // Build ordered step funnel
      const stepOrder = [
        'welcome', 'setup', 'completed', 'semester', 'future',
        'reviewSummary', 'reviewActions',
      ]
      const stepFunnel: StepFunnel[] = stepOrder
        .filter((id) => stepTotals[id])
        .map((id) => ({ stepId: id, visits: stepTotals[id] }))

      const total = subsSnap.size

      setSummary({
        totalSubmissions: total,
        byProgram: { english, writing, creativeWriting },
        byGraduation,
        recentDays: recentDays.reverse(),
        courseDemand,
        insights: {
          hasNotesCount,
          avgDegreeProgress: total > 0 ? Math.round(totalProgress / total) : 0,
        },
        stepFunnel,
        peakHours,
        exportCounts,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, loading, error, refresh }
}

function getCurrentTerm(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear().toString().slice(-2)
  if (month >= 8) return `fa${year}`
  if (month >= 5) return `su${year}`
  return `sp${year}`
}
