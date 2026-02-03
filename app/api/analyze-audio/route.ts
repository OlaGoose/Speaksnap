import { NextRequest, NextResponse } from 'next/server';
import { analyzeAudio, NO_AI_PROVIDER_MESSAGE } from '@/lib/ai/service';

function isUnavailableError(message: string): boolean {
  return (
    message === NO_AI_PROVIDER_MESSAGE ||
    message.includes('All AI providers failed') ||
    message.includes('No AI provider')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, level, mode, location, provider } = body;

    if (!audio || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: audio, level' },
        { status: 400 }
      );
    }

    const result = await analyzeAudio(audio, level, location, mode ?? 'Daily', provider);

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    console.error('Analyze audio API error:', error);
    const status = isUnavailableError(message) ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? 'AI service unavailable. Please check your API keys and try again.' : message },
      { status }
    );
  }
}
