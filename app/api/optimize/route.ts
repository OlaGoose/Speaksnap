import { NextRequest, NextResponse } from 'next/server';
import { optimizeText } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const optimized = await optimizeText(text);

    return NextResponse.json({ optimized });
  } catch (error: any) {
    console.error('Optimize API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
