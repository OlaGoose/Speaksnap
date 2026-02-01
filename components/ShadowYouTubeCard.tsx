'use client';

import React, { useState } from 'react';
import type { ShadowWordAnalysis } from '@/lib/types';

interface RecommendedVideo {
  videoId: string;
  title: string;
  summary: string;
  relevanceScore?: number;
}

interface ShadowYouTubeCardProps {
  words: ShadowWordAnalysis[];
  weaknesses?: string[];
  title?: string;
  recommendedVideos?: RecommendedVideo[];
}

/**
 * Error Boundary for YouTube Card
 * Prevents YouTube errors from breaking the entire Shadow flow
 */
class YouTubeCardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ShadowYouTubeCard] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

/**
 * YouTube pronunciation guides card for Shadow Reading.
 * Displays TOP 3 AI-recommended videos based on practice context from PDF library.
 */
function ShadowYouTubeCardInner({ 
  words, 
  weaknesses, 
  title = 'Recommended Videos',
  recommendedVideos = []
}: ShadowYouTubeCardProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Show loading state if no videos yet
  if (recommendedVideos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-700 font-medium">Loading...</span>
          </div>
        </div>
        <div className="text-sm text-gray-500 text-center py-4">
          Finding the best videos for your practice...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full">
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
          <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
            AI Matched
          </span>
        </div>
      </div>

      {weaknesses && weaknesses.length > 0 && (
        <div className="text-sm text-gray-600 space-y-2">
          <p className="font-medium">Focus areas to improve:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            {weaknesses.slice(0, 3).map((weakness, idx) => (
              <li key={idx} className="text-sm">{weakness}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {recommendedVideos.map((video, idx) => (
          <button
            key={video.videoId}
            type="button"
            onClick={() => setPlayingVideoId(video.videoId)}
            className="w-full flex gap-3 p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all text-left relative group"
          >
            {/* Relevance badge */}
            {idx === 0 && (
              <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                Best Match
              </div>
            )}
            <div className="flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-900 shadow-md group-hover:shadow-lg transition-shadow">
              <img
                src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                alt={video.title}
                className="w-28 h-20 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.videoId}/default.jpg`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <span className="text-sm font-semibold text-primary-900 line-clamp-2 leading-tight">
                {video.title}
              </span>
              {video.summary && (
                <span className="text-xs text-gray-500 line-clamp-1">
                  {video.summary}
                </span>
              )}
              {video.relevanceScore && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden flex-1 max-w-[80px]">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${video.relevanceScore}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {video.relevanceScore}% match
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* In-site embed overlay (same pattern as FlashcardDeck) */}
      {playingVideoId && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setPlayingVideoId(null)}
        >
          <div
            className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              key={playingVideoId}
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
              title="Pronunciation guide"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
            <button
              type="button"
              onClick={() => setPlayingVideoId(null)}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-colors"
              aria-label="Close video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Exported component with error boundary
 */
export function ShadowYouTubeCard(props: ShadowYouTubeCardProps) {
  return (
    <YouTubeCardErrorBoundary>
      <ShadowYouTubeCardInner {...props} />
    </YouTubeCardErrorBoundary>
  );
}
