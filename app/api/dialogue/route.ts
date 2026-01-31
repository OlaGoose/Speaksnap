import { NextRequest, NextResponse } from 'next/server';
import { continueDialogue, NO_AI_PROVIDER_MESSAGE } from '@/lib/ai/service';

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
    const { history, userText, scenarioContext, level } = body;

    if (!Array.isArray(history) || typeof userText !== 'string' || level == null || level === '') {
      return NextResponse.json(
        { error: 'Missing required fields: history, userText, level' },
        { status: 400 }
      );
    }

    const context = typeof scenarioContext === 'string' ? scenarioContext : 'General conversation practice.';

    const result = await continueDialogue(history, userText, context, level);

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    console.error('Dialogue API error:', error);
    const status = isUnavailableError(message) ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? 'AI service unavailable. Please check your API keys and try again.' : message },
      { status }
    );
  }
}
