import { NextRequest, NextResponse } from 'next/server';
import { generateDiaryOutline } from '@/lib/ai/diary-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, level } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Missing topic' },
        { status: 400 }
      );
    }

    const outline = await generateDiaryOutline(topic, level || 'B1');

    return NextResponse.json(outline);
  } catch (error: any) {
    console.error('Outline API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
