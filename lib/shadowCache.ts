/**
 * Simple in-memory cache for shadow reading challenges.
 * Prefetch when user enters Library, reuse when ShadowReadingScreen mounts.
 */

import type { UserLevel } from './types';

interface CachedChallenge {
  topic: string;
  text: string;
  sourceUrl?: string;
  refAudioBase64: string;
  timestamp: number;
  level: UserLevel;
}

let cache: CachedChallenge | null = null;
let inFlightRequest: Promise<CachedChallenge> | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cached challenge is valid for the given level
 */
function isCacheValid(level: UserLevel): boolean {
  if (!cache) return false;
  if (cache.level !== level) return false;
  if (Date.now() - cache.timestamp > CACHE_TTL) return false;
  return true;
}

/**
 * Prefetch challenge for the given level (fire and forget).
 * Called when user clicks Shadow tab in Library.
 */
export async function prefetchShadowChallenge(level: UserLevel): Promise<void> {
  // If already valid in cache or request in flight, skip
  if (isCacheValid(level) || inFlightRequest) return;

  try {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/shadow/challenge`
        : '/api/shadow/challenge';
    
    const requestPromise = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load challenge');
        return {
          topic: data.topic,
          text: data.text,
          sourceUrl: data.sourceUrl,
          refAudioBase64: data.refAudioBase64,
          timestamp: Date.now(),
          level,
        } as CachedChallenge;
      })
      .then((result) => {
        cache = result;
        inFlightRequest = null;
        return result;
      })
      .catch((e) => {
        console.warn('Shadow prefetch failed:', e);
        inFlightRequest = null;
        throw e;
      });

    inFlightRequest = requestPromise;
    await requestPromise;
  } catch (e) {
    // Silently fail for prefetch
  }
}

/**
 * Get cached challenge if valid, or wait for in-flight request.
 * Returns null if no cache and no request.
 */
export function getCachedChallenge(level: UserLevel): CachedChallenge | null {
  if (isCacheValid(level)) return cache;
  return null;
}

/**
 * Get in-flight request promise if exists
 */
export function getInFlightRequest(): Promise<CachedChallenge> | null {
  return inFlightRequest;
}

/**
 * Clear cache (e.g. on error or manual refresh)
 */
export function clearShadowCache(): void {
  cache = null;
  inFlightRequest = null;
}
