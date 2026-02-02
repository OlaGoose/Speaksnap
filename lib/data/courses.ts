/**
 * Mainstream English courses for the Textbook tab.
 * Users can choose a course and practice with full lesson content.
 */

import { NCE2_LESSONS } from './nce2-lessons';
import { NCE3_LESSONS } from './nce3-lessons';

export interface Lesson {
  id: number;
  title: string;
  text: string;
}

export interface Course {
  id: string;
  name: string;
  lessons: Lesson[];
}

export const COURSES: Course[] = [
  { id: 'nce2', name: 'New Concept English 2', lessons: NCE2_LESSONS },
  { id: 'nce3', name: 'New Concept English 3', lessons: NCE3_LESSONS },
];

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export function getLesson(courseId: string, lessonId: number): Lesson | undefined {
  const course = getCourse(courseId);
  return course?.lessons.find((l) => l.id === lessonId);
}
