import { NextRequest, NextResponse } from 'next/server';
import { analyzeAudio } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, level, mode, location } = body;

    if (!audio || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: audio, level' },
        { status: 400 }
      );
    }

    const result = await analyzeAudio(audio, level, location, mode);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analyze audio API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
