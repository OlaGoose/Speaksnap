'use client';

import { useState, useEffect } from 'react';
import type { ColorScheme } from '@/lib/constants/theme';

export type { ColorScheme };

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

function getSchemeFromTime(): ColorScheme {
  if (typeof window === 'undefined') return 'light';
  const hour = new Date().getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'light' : 'dark';
}

/**
 * Time-based day/night theme.
 * - light (day, 6:00–18:00): white/light background, dark text
 * - dark (night, 18:00–6:00): black/dark background, white text
 * Updates every minute so the theme switches at 6:00 and 18:00.
 */
export function useTheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>('light');

  useEffect(() => {
    const update = () => setScheme(getSchemeFromTime());
    update();
    const interval = setInterval(update, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return scheme;
}
