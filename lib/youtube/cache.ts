/**
 * YouTube Search Cache for Client-Side
 * Simple localStorage-based caching to reduce API calls
 */

export interface CachedYouTubeSearch {
  query: string;
  videos: any[];
  source: string;
  timestamp: number;
  expiresAt: number;
}

const CACHE_KEY_PREFIX = 'youtube_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached YouTube search result
 */
export function getCachedSearch(query: string): CachedYouTubeSearch | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = CACHE_KEY_PREFIX + encodeURIComponent(query);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const data: CachedYouTubeSearch = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('[YouTube Cache] Failed to get cached search:', error);
    return null;
  }
}

/**
 * Save YouTube search result to cache
 */
export function setCachedSearch(
  query: string,
  videos: any[],
  source: string
): void {
  if (typeof window === 'undefined') return;
  
  const cacheKey = CACHE_KEY_PREFIX + encodeURIComponent(query);
  const data: CachedYouTubeSearch = {
    query,
    videos,
    source,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_DURATION,
  };
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('[YouTube Cache] Failed to save cached search:', error);
    // If quota exceeded, try to clear old cache
    try {
      clearExpiredCache();
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
      // Silent fail if still can't save
    }
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data = JSON.parse(cached);
            if (now > data.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // If parsing fails, remove the key
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove expired keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log(`[YouTube Cache] Cleared ${keysToRemove.length} expired entries`);
    }
  } catch (error) {
    console.warn('[YouTube Cache] Failed to clear expired cache:', error);
  }
}

/**
 * Clear all YouTube cache
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[YouTube Cache] Cleared all cache (${keysToRemove.length} entries)`);
  } catch (error) {
    console.warn('[YouTube Cache] Failed to clear all cache:', error);
  }
}

// Auto-clear expired cache on module load (only in browser)
if (typeof window !== 'undefined') {
  // Run on load
  setTimeout(() => clearExpiredCache(), 1000);
  
  // Run daily
  setInterval(() => clearExpiredCache(), 24 * 60 * 60 * 1000);
}
