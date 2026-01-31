'use client';

import React from 'react';
import { useYouTubeSearch } from '@/lib/hooks/useYouTubeSearch';
import { ExternalLink, Loader2 } from 'lucide-react';

interface ShadowYouTubeCardProps {
  weaknesses: string[];
  title?: string;
}

/**
 * YouTube pronunciation teaching videos card for Shadow Reading
 * Shows videos based on detected pronunciation issues
 */
export function ShadowYouTubeCard({ weaknesses, title = 'Pronunciation Guides' }: ShadowYouTubeCardProps) {
  // Extract key pronunciation issues to search for (sanitize for URL / API)
  const searchQuery = React.useMemo(() => {
    if (!weaknesses || weaknesses.length === 0) return null;
    const firstIssue = weaknesses[0]
      .replace(/[''""`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    if (!firstIssue) return null;
    return `english pronunciation ${firstIssue} tutorial`;
  }, [weaknesses]);

  const { videos, loading, error } = useYouTubeSearch(searchQuery, !!searchQuery);

  if (!searchQuery || weaknesses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-xs text-red-700 font-medium">Recommended</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary-900" size={24} />
        </div>
      )}

      {error && (
        <p className="text-sm text-gray-500 text-center py-4">
          Unable to load videos. Please try again later.
        </p>
      )}

      {!loading && !error && videos.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No pronunciation guides found.
        </p>
      )}

      {!loading && !error && videos.length > 0 && (
        <>
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">Focus areas to improve:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              {weaknesses.slice(0, 3).map((weakness, idx) => (
                <li key={idx} className="text-sm">{weakness}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {videos.slice(0, 5).map((video) => (
              <a
                key={video.videoId}
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex-shrink-0 relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-28 h-20 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                      <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-sm font-medium text-primary-900 line-clamp-2 group-hover:text-primary-700">
                    {video.title}
                  </h4>
                  <p className="text-xs text-gray-500">{video.channelTitle}</p>
                  <div className="flex items-center gap-1 text-gray-400">
                    <ExternalLink size={12} />
                    <span className="text-xs">Watch on YouTube</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
