import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/ai/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (text == null || String(text).trim() === '') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const translation = await translateText(String(text).trim());

    return NextResponse.json({ translation });
  } catch (error: any) {
    console.error('Translate API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
