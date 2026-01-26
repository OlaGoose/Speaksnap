import { NextRequest, NextResponse } from 'next/server';
import { continueDialogue } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { history, userText, scenarioContext, level } = body;

    if (!history || !userText || !scenarioContext || !level) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await continueDialogue(history, userText, scenarioContext, level);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Dialogue API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
