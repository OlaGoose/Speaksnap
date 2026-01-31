/**
 * IndexedDB storage utilities using localforage (industry best practice)
 * - Large storage capacity (hundreds of MB to GB)
 * - Async API for better performance
 * - Automatic fallback to WebSQL/localStorage
 */

import localforage from 'localforage';

// Configure localforage instance
localforage.config({
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  name: 'SpeakSnap',
  version: 1.0,
  storeName: 'speaksnap_store',
  description: 'SpeakSnap application data storage',
});

// In-memory cache to reduce IndexedDB access
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

export const storage = {
  /**
   * Get item from IndexedDB with in-memory caching
   */
  async getItem<T = any>(key: string, useCache = true): Promise<T | null> {
    try {
      // Check cache first
      if (useCache && cache.has(key)) {
        const cached = cache.get(key)!;
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.data as T;
        }
        cache.delete(key);
      }

      const value = await localforage.getItem<T>(key);
      
      // Update cache
      if (value !== null && useCache) {
        cache.set(key, { data: value, timestamp: Date.now() });
      }

      return value;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  },

  /**
   * Set item to IndexedDB with in-memory caching
   */
  async setItem<T = any>(key: string, value: T): Promise<boolean> {
    try {
      await localforage.setItem(key, value);
      
      // Update cache
      cache.set(key, { data: value, timestamp: Date.now() });
      
      return true;
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
      return false;
    }
  },

  /**
   * Remove item from IndexedDB and cache
   */
  async removeItem(key: string): Promise<void> {
    try {
      await localforage.removeItem(key);
      cache.delete(key);
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
    }
  },

  /**
   * Clear all cache (memory only, doesn't affect IndexedDB)
   */
  clearCache(): void {
    cache.clear();
  },

  /**
   * Clear old items to free up space (removes items older than 30 days)
   */
  async clearOldItems(): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      await localforage.iterate((value: any, key: string) => {
        if (Array.isArray(value)) {
          // For arrays of items with timestamps
          const filtered = value.filter((item: any) => {
            return !item.timestamp || item.timestamp > thirtyDaysAgo;
          });
          
          if (filtered.length < value.length) {
            if (filtered.length === 0) {
              localforage.removeItem(key);
            } else {
              localforage.setItem(key, filtered);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error clearing old items:', error);
    }
  },

  /**
   * Get all keys in storage
   */
  async keys(): Promise<string[]> {
    try {
      return await localforage.keys();
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  },

  /**
   * Get storage usage info (estimate)
   */
  async getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = available > 0 ? (used / available) * 100 : 0;
        return { used, available, percentage };
      }
      return { used: 0, available: 0, percentage: 0 };
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
