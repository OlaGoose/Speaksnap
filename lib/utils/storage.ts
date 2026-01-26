/**
 * Optimized localStorage utilities with error handling and caching
 */

// In-memory cache to reduce localStorage access
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

export const storage = {
  /**
   * Get item from localStorage with caching
   */
  getItem<T = any>(key: string, useCache = true): T | null {
    try {
      // Check cache first
      if (useCache && cache.has(key)) {
        const cached = cache.get(key)!;
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.data as T;
        }
        cache.delete(key);
      }

      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Update cache
      if (useCache) {
        cache.set(key, { data: parsed, timestamp: Date.now() });
      }

      return parsed as T;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  },

  /**
   * Set item to localStorage with caching
   */
  setItem<T = any>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      
      // Update cache
      cache.set(key, { data: value, timestamp: Date.now() });
      
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      
      // Try to clear some space if quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearOldItems();
        // Retry once
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  },

  /**
   * Remove item from localStorage and cache
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
      cache.delete(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  },

  /**
   * Clear all cache
   */
  clearCache(): void {
    cache.clear();
  },

  /**
   * Clear old items to free up space (removes items older than 30 days)
   */
  clearOldItems(): void {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const item = localStorage.getItem(key);
          if (!item) continue;

          const parsed = JSON.parse(item);
          
          // Check if item has timestamp and is old
          if (Array.isArray(parsed)) {
            // For arrays of items with timestamps
            const filtered = parsed.filter((item: any) => {
              return !item.timestamp || item.timestamp > thirtyDaysAgo;
            });
            
            if (filtered.length < parsed.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          }
        } catch {
          // Skip items that can't be parsed
        }
      }
    } catch (error) {
      console.error('Error clearing old items:', error);
    }
  },

  /**
   * Get storage usage info
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const item = localStorage.getItem(key);
          used += (key.length + (item?.length || 0)) * 2; // UTF-16 encoding
        }
      }

      const available = 5 * 1024 * 1024; // 5MB typical limit
      const percentage = (used / available) * 100;

      return { used, available, percentage };
    } catch {
      return { used: 0, available: 0, percentage: 0 };
    }
  },
};

/**
 * Debounce function for optimizing frequent operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for limiting execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
