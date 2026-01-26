/**
 * API request utilities with caching and optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 50; // Maximum cache entries

  set<T>(key: string, data: T, expiresIn = 300000): void {
    // 5 minutes default
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new APICache();

// Clear expired cache entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.clearExpired();
  }, 300000);
}

/**
 * Generate cache key from request parameters
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Fetch with caching
 */
export async function cachedFetch<T = any>(
  url: string,
  options?: RequestInit & { cacheTime?: number; skipCache?: boolean }
): Promise<T> {
  const { cacheTime, skipCache, ...fetchOptions } = options || {};
  const cacheKey = generateCacheKey(url, fetchOptions);

  // Check cache for GET requests
  if (!skipCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Make request
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache GET requests
  if (!skipCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    apiCache.set(cacheKey, data, cacheTime);
  }

  return data as T;
}

/**
 * Debounced API request
 */
export function debouncedRequest<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;

  return function (...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeout = null;
          }
        }, wait);
      });
    }

    return pendingPromise;
  };
}

/**
 * Request queue for managing concurrent API requests
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent = 3;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(async () => {
          resolve();
          return fn();
        });
      });
    }

    this.running++;

    try {
      const result = await fn();
      return result;
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

export const requestQueue = new RequestQueue();

/**
 * Retry failed requests with exponential backoff
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Clear all API caches
 */
export function clearAPICache(): void {
  apiCache.clear();
}
