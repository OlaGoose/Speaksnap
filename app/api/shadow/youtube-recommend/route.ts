/**
 * Shadow YouTube Video Recommendation API
 * Recommends relevant YouTube videos based on shadow reading context
 */

import { NextResponse } from 'next/server';
import { recommendYouTubeVideo } from '@/lib/ai/shadow-service';

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

    const recommendation = await recommendYouTubeVideo(
      practiceText,
      Array.isArray(weaknesses) ? weaknesses : [],
      pdfFileUri
    );

    if (!recommendation) {
      return NextResponse.json(
        { error: 'No suitable video found or recommendation service unavailable' },
        { status: 404 }
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('YouTube recommendation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to recommend video', details: message },
      { status: 500 }
    );
  }
}
