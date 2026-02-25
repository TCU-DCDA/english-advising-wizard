import { useState, useEffect, createContext, useContext } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { ProgramId, ProgramData, PrerequisitesData, CourseOfferings } from '@/types'
import type { CatalogCourse } from '@/data/allCourses'

// Static fallback imports (bundled at build time)
import staticPrograms from '@/data/programs.json'
import staticPrerequisites from '@/data/prerequisites.json'
import staticOfferings from '@/data/offerings-fa26.json'
import { allCourses as staticCourses } from '@/data/allCourses'

export interface EnglishData {
  programs: Record<ProgramId, ProgramData>
  prerequisites: PrerequisitesData
  offerings: CourseOfferings
  courses: CatalogCourse[]
  loading: boolean
}

const defaultData: EnglishData = {
  programs: staticPrograms as Record<ProgramId, ProgramData>,
  prerequisites: staticPrerequisites as PrerequisitesData,
  offerings: staticOfferings as CourseOfferings,
  courses: staticCourses,
  loading: true,
}

export const EnglishDataContext = createContext<EnglishData>(defaultData)

export function useEnglishData(): EnglishData {
  return useContext(EnglishDataContext)
}

/** Hook that subscribes to Firestore and returns live data with static fallback */
export function useEnglishDataLoader(): EnglishData {
  const [data, setData] = useState<EnglishData>(defaultData)

  useEffect(() => {
    let programsLoaded = false
    let prerequisitesLoaded = false
    let offeringsLoaded = false
    let coursesLoaded = false

    const checkDone = () => {
      if (programsLoaded && prerequisitesLoaded && offeringsLoaded && coursesLoaded) {
        setData((prev) => ({ ...prev, loading: false }))
      }
    }

    // Subscribe to programs
    const unsubPrograms = onSnapshot(
      doc(db, 'english_config', 'programs'),
      (snap) => {
        if (snap.exists()) {
          setData((prev) => ({
            ...prev,
            programs: snap.data() as Record<ProgramId, ProgramData>,
          }))
        }
        programsLoaded = true
        checkDone()
      },
      () => {
        // Firestore unavailable — keep static fallback
        programsLoaded = true
        checkDone()
      }
    )

    // Subscribe to prerequisites
    const unsubPrereqs = onSnapshot(
      doc(db, 'english_config', 'prerequisites'),
      (snap) => {
        if (snap.exists()) {
          setData((prev) => ({
            ...prev,
            prerequisites: snap.data() as PrerequisitesData,
          }))
        }
        prerequisitesLoaded = true
        checkDone()
      },
      () => {
        prerequisitesLoaded = true
        checkDone()
      }
    )

    // Subscribe to current term offerings
    const unsubOfferings = onSnapshot(
      doc(db, 'english_config', 'offerings_fa26'),
      (snap) => {
        if (snap.exists()) {
          setData((prev) => ({
            ...prev,
            offerings: snap.data() as CourseOfferings,
          }))
        }
        offeringsLoaded = true
        checkDone()
      },
      () => {
        offeringsLoaded = true
        checkDone()
      }
    )

    // Subscribe to courses catalog
    const unsubCourses = onSnapshot(
      doc(db, 'english_config', 'courses'),
      (snap) => {
        if (snap.exists()) {
          const coursesDoc = snap.data() as { courses: CatalogCourse[] }
          if (coursesDoc.courses) {
            setData((prev) => ({ ...prev, courses: coursesDoc.courses }))
          }
        }
        coursesLoaded = true
        checkDone()
      },
      () => {
        coursesLoaded = true
        checkDone()
      }
    )

    return () => {
      unsubPrograms()
      unsubPrereqs()
      unsubOfferings()
      unsubCourses()
    }
  }, [])

  return data
}
