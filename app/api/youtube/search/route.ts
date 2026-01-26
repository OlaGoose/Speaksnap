/**
 * YouTube Search API Route
 * Provides YouTube video search for flashcard learning
 * Multi-tier strategy: RSS Feed -> HTML -> API
 * Includes client-side caching support
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchYouTube } from '@/lib/youtube/search';

interface YouTubeSearchResponse {
  videos: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    publishedAt: string;
    duration?: string;
  }>;
  source?: 'rss' | 'html' | 'api' | 'cache';
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Perform smart search with multi-tier fallback
    const result = await searchYouTube(query);
    
    if (result.error) {
      // Return error but don't fail completely
      console.error('[YouTube API] Search failed:', result.error);
      return NextResponse.json(
        { error: result.error, videos: [], source: result.source },
        { status: 200 } // Return 200 to allow graceful handling on client
      );
    }

    const response: YouTubeSearchResponse = {
      videos: result.videos,
      source: result.source,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[YouTube API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'YouTube search failed',
        videos: [],
      },
      { status: 500 }
    );
  }
}
