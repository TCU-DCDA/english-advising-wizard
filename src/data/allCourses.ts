import { ALL_COURSES } from '@/allCourses'

export interface CatalogCourse {
  code: string
  title: string
  hours: number
  description?: string
}

export const allCourses: CatalogCourse[] = ALL_COURSES
