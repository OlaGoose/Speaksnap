/**
 * Shadow YouTube Video Recommendation API
 * Recommends TOP 3 relevant YouTube videos based on shadow reading context
 */

import { NextResponse } from 'next/server';
import { recommendYouTubeVideos } from '@/lib/ai/shadow-service';

export const maxDuration = 60; // Allow up to 60 seconds for PDF processing

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { practiceText, weaknesses, pdfFileUri } = body;

    if (!practiceText || typeof practiceText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid practiceText' },
        { status: 400 }
      );
    }

    const recommendations = await recommendYouTubeVideos(
      practiceText,
      Array.isArray(weaknesses) ? weaknesses : [],
      pdfFileUri
    );

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'No suitable videos found or recommendation service unavailable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ videos: recommendations });
  } catch (error) {
    console.error('YouTube recommendation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to recommend videos', details: message },
      { status: 500 }
    );
  }
}
