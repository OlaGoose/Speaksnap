/**
 * Local cache for textbook lesson reference audio (per course).
 * Persists to IndexedDB via storage so ref audio is not re-fetched on revisit.
 * Supports refresh: clear cache for a lesson or for a whole course.
 */

import { storage } from '@/lib/utils/storage';

const KEY_PREFIX = 'textbook_ref_audio_';

export interface CachedLessonAudio {
  refAudioBase64: string;
  courseId: string;
  lessonId: number;
  timestamp: number;
}

function cacheKey(courseId: string, lessonId: number): string {
  return `${KEY_PREFIX}${courseId}_${lessonId}`;
}

export async function getCachedRefAudio(courseId: string, lessonId: number): Promise<string | null> {
  try {
    const key = cacheKey(courseId, lessonId);
    const cached = await storage.getItem<CachedLessonAudio>(key, false);
    if (cached && typeof cached.refAudioBase64 === 'string') {
      return cached.refAudioBase64;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedRefAudio(
  courseId: string,
  lessonId: number,
  refAudioBase64: string
): Promise<void> {
  try {
    const key = cacheKey(courseId, lessonId);
    await storage.setItem<CachedLessonAudio>(key, {
      refAudioBase64,
      courseId,
      lessonId,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn('Textbook cache write failed:', e);
  }
}

/** Clear cached ref audio for one lesson (so next open will re-fetch). */
export async function clearCachedRefAudio(courseId: string, lessonId: number): Promise<void> {
  try {
    await storage.removeItem(cacheKey(courseId, lessonId));
  } catch (e) {
    console.warn('Textbook cache clear failed:', e);
  }
}

/** Clear all cached ref audio for a course (refresh course content). */
export async function clearCachedRefAudioForCourse(courseId: string): Promise<void> {
  try {
    const prefix = `${KEY_PREFIX}${courseId}_`;
    const keys = await storage.keys();
    for (const key of keys) {
      if (key.startsWith(prefix)) await storage.removeItem(key);
    }
  } catch (e) {
    console.warn('Textbook course cache clear failed:', e);
  }
}
