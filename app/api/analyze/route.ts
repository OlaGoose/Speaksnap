import { NextRequest, NextResponse } from 'next/server';
import { analyzeScene } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, level, location } = body;

    if (!image || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: image, level' },
        { status: 400 }
      );
    }

    const result = await analyzeScene(image, level, location);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
