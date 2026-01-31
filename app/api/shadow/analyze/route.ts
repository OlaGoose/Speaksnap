import { NextRequest, NextResponse } from 'next/server';
import { analyzeShadowReading } from '@/lib/ai/shadow-service';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAudioBase64, userMimeType, refAudioBase64, refText } = body;

    if (!userAudioBase64 || !refAudioBase64 || !refText) {
      return NextResponse.json(
        { error: 'Missing userAudioBase64, refAudioBase64, or refText' },
        { status: 400 }
      );
    }

    const result = await analyzeShadowReading(
      userAudioBase64,
      userMimeType || 'audio/webm',
      refAudioBase64,
      refText
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Shadow analyze API error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    const isUnavailable =
      message.includes('API key') ||
      message.includes('No AI provider') ||
      message.includes('GEMINI_API_KEY');
    const status = isUnavailable ? 503 : 500;
    const safeMessage = isUnavailable
      ? 'AI service unavailable. Please check your API keys and try again.'
      : message;
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
