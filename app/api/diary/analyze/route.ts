import { NextRequest, NextResponse } from 'next/server';
import { analyzeDiaryDraft } from '@/lib/ai/diary-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, level } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      );
    }

    const analysis = await analyzeDiaryDraft(text, level || 'B1');

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
