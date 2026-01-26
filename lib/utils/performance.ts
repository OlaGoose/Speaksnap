/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  /**
   * Measure function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.addMetric(name, duration);
      
      if (duration > 1000) {
        console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.addMetric(`${name} (failed)`, duration);
      throw error;
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - start;
      
      this.addMetric(name, duration);
      
      if (duration > 100) {
        console.warn(`⚠️ Slow sync operation: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.addMetric(`${name} (failed)`, duration);
      throw error;
    }
  }

  private addMetric(name: string, duration: number): void {
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift();
    }

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average duration for a specific operation
   */
  getAverageDuration(name: string): number {
    const filtered = this.metrics.filter((m) => m.name === name);
    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(count = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    if (this.metrics.length === 0) {
      console.log('No performance metrics collected');
      return;
    }

    console.group('Performance Summary');
    
    const slowest = this.getSlowestOperations(5);
    console.log('Slowest operations:', slowest);

    const uniqueNames = [...new Set(this.metrics.map((m) => m.name))];
    const averages = uniqueNames.map((name) => ({
      name,
      average: this.getAverageDuration(name),
      count: this.metrics.filter((m) => m.name === name).length,
    }));

    console.log('Average durations:', averages);
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure React component render time
 */
export function measureRender(componentName: string) {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    
    if (duration > 16.67) {
      // More than one frame (60fps)
      console.warn(
        `⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`
      );
    }

    performanceMonitor.measure(`Render: ${componentName}`, () => duration);
  };
}

/**
 * Get Web Vitals metrics
 */
export function getWebVitals(): void {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  const fcpObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FCP:', entry.startTime.toFixed(2), 'ms');
    }
  });
  fcpObserver.observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime.toFixed(2), 'ms');
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fid = (entry as any).processingStart - entry.startTime;
      console.log('FID:', fid.toFixed(2), 'ms');
    }
  });
  fidObserver.observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
        console.log('CLS:', clsValue.toFixed(3));
      }
    }
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });
}

/**
 * Log bundle size impact
 */
export function logBundleInfo(): void {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  const scripts = resources.filter((r) => r.initiatorType === 'script');
  const totalScriptSize = scripts.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  
  const styles = resources.filter((r) => r.initiatorType === 'link' || r.initiatorType === 'css');
  const totalStyleSize = styles.reduce((sum, r) => sum + (r.transferSize || 0), 0);

  console.group('Bundle Info');
  console.log(`Scripts: ${(totalScriptSize / 1024).toFixed(2)} KB (${scripts.length} files)`);
  console.log(`Styles: ${(totalStyleSize / 1024).toFixed(2)} KB (${styles.length} files)`);
  console.groupEnd();
}

/**
 * Detect slow network
 */
export function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const connection = (navigator as any).connection;
  if (!connection) return false;

  // Check for 2G or slow-2g
  return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
}

/**
 * Get memory usage (Chrome only)
 */
export function getMemoryUsage(): { used: number; total: number; percentage: number } | null {
  if (typeof performance === 'undefined' || !(performance as any).memory) {
    return null;
  }

  const memory = (performance as any).memory;
  const used = memory.usedJSHeapSize;
  const total = memory.jsHeapSizeLimit;
  const percentage = (used / total) * 100;

  return {
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round(percentage),
  };
}
