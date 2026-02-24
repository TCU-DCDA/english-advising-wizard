import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { EnglishDataContext, useEnglishDataLoader } from '@/hooks/useEnglishData'
import { updateCourseServiceData } from '@/services/courses'

interface EnglishDataProviderProps {
  children: ReactNode
}

export function EnglishDataProvider({ children }: EnglishDataProviderProps) {
  const data = useEnglishDataLoader()

  // Sync Firestore data to the module-level course service
  useEffect(() => {
    if (!data.loading) {
      updateCourseServiceData({
        programs: data.programs,
        prerequisites: data.prerequisites,
        offerings: data.offerings,
        courses: data.courses,
      })
    }
  }, [data])

  return (
    <EnglishDataContext.Provider value={data}>
      {children}
    </EnglishDataContext.Provider>
  )
}
