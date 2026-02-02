/**
 * Local cache for textbook (NCE2) lesson reference audio.
 * Persists to IndexedDB via storage so ref audio is not re-fetched on revisit.
 */

import { storage } from '@/lib/utils/storage';

const KEY_PREFIX = 'textbook_ref_audio_';

export interface CachedLessonAudio {
  refAudioBase64: string;
  lessonId: number;
  timestamp: number;
}

export async function getCachedRefAudio(lessonId: number): Promise<string | null> {
  try {
    const key = `${KEY_PREFIX}${lessonId}`;
    const cached = await storage.getItem<CachedLessonAudio>(key, false);
    if (cached && typeof cached.refAudioBase64 === 'string') {
      return cached.refAudioBase64;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedRefAudio(lessonId: number, refAudioBase64: string): Promise<void> {
  try {
    const key = `${KEY_PREFIX}${lessonId}`;
    await storage.setItem<CachedLessonAudio>(key, {
      refAudioBase64,
      lessonId,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn('Textbook cache write failed:', e);
  }
}
