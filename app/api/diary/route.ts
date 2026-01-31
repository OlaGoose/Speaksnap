import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompleteDiary } from '@/lib/ai/diary-service';

function isUnavailableError(message: string): boolean {
  return (
    message.includes('No AI provider') ||
    message.includes('All AI providers failed') ||
    message.includes('No AI provider configured')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (text == null || String(text).trim() === '') {
      return NextResponse.json(
        { error: 'Missing diary text' },
        { status: 400 }
      );
    }

    const result = await analyzeCompleteDiary(String(text).trim());

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    console.error('Diary API error:', error);
    const status = isUnavailableError(message) ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? 'AI service unavailable. Please check your API keys and try again.' : message },
      { status }
    );
  }
}
