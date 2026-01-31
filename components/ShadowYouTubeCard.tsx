'use client';

import React, { useState } from 'react';
import type { ShadowWordAnalysis } from '@/lib/types';

/** Fixed pronunciation guide video IDs (in-site embed, no external redirect). */
const SHADOW_YOUTUBE_VIDEO_IDS = ['QxQUapA-2w4', 'q7SAt9h4sd0'] as const;

interface RecommendedVideo {
  videoId: string;
  title: string;
  summary: string;
}

interface ShadowYouTubeCardProps {
  words: ShadowWordAnalysis[];
  weaknesses?: string[];
  title?: string;
  recommendedVideo?: RecommendedVideo | null;
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
 * Fixed 2 videos + optional AI-recommended video based on practice context.
 */
function ShadowYouTubeCardInner({ 
  words, 
  weaknesses, 
  title = 'Pronunciation Guides',
  recommendedVideo 
}: ShadowYouTubeCardProps) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Combine fixed videos with recommended video (if available)
  const allVideos = [
    ...SHADOW_YOUTUBE_VIDEO_IDS.map((id, idx) => ({
      id,
      title: `Pronunciation guide ${idx + 1}`,
      isRecommended: false,
    })),
    ...(recommendedVideo?.videoId ? [{
      id: recommendedVideo.videoId,
      title: recommendedVideo.title,
      isRecommended: true,
    }] : []),
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-float border border-black/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-xs text-red-700 font-medium">Recommended</span>
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
        {allVideos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setPlayingVideoId(video.id)}
            className="w-full flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left relative"
          >
            {video.isRecommended && (
              <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                AI Match
              </div>
            )}
            <div className="flex-shrink-0 relative rounded-lg overflow-hidden bg-gray-900">
              <img
                src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                alt={video.title}
                className="w-28 h-20 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/default.jpg`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center opacity-90">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex items-center">
              <span className="text-sm font-medium text-primary-900 line-clamp-2">{video.title}</span>
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
