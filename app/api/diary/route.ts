import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompleteDiary } from '@/lib/ai/diary-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Missing diary text' },
        { status: 400 }
      );
    }

    const result = await analyzeCompleteDiary(text);
    
    console.log('📊 Diary analysis result keys:', Object.keys(result));
    console.log('📊 Has dimensions:', !!result.dimensions);
    console.log('📊 Has sentenceAnalysis:', !!result.sentenceAnalysis);
    console.log('📊 overallScore:', result.overallScore);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Diary API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
