/**
 * useYouTubeSearch Hook
 * React hook for searching YouTube videos with caching
 */

import { useState, useEffect } from 'react';
import { getCachedSearch, setCachedSearch } from '@/lib/youtube/cache';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export interface UseYouTubeSearchResult {
  videos: YouTubeVideo[];
  loading: boolean;
  error: string | null;
  source: 'cache' | 'rss' | 'html' | 'api' | null;
}

/**
 * Hook to search YouTube videos with caching
 * @param query Search query
 * @param enabled Whether to enable the search (default: true)
 * @returns Search result with videos, loading state, and error
 */
export function useYouTubeSearch(
  query: string | null,
  enabled: boolean = true
): UseYouTubeSearchResult {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'rss' | 'html' | 'api' | null>(null);

  useEffect(() => {
    if (!query || !enabled) {
      setVideos([]);
      setError(null);
      setLoading(false);
      setSource(null);
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function search() {
      if (!query || cancelled) return;

      setLoading(true);
      setError(null);

      try {
        // Check cache first
        const cached = getCachedSearch(query);
        if (cached && cached.videos.length > 0) {
          if (!cancelled) {
            setVideos(cached.videos);
            setSource('cache');
            setLoading(false);
          }
          return;
        }

        // Fetch from API
        const response = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(query)}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to search YouTube');
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.error && (!data.videos || data.videos.length === 0)) {
          setError(data.error);
          setVideos([]);
          setSource(null);
        } else {
          setVideos(data.videos || []);
          setSource(data.source || null);
          setError(null);
          if (data.videos && data.videos.length > 0) {
            setCachedSearch(query, data.videos, data.source || 'api');
          }
        }
      } catch (err) {
        if (cancelled) return;

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to search YouTube');
        setVideos([]);
        setSource(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    search();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [query, enabled]);

  return { videos, loading, error, source };
}
