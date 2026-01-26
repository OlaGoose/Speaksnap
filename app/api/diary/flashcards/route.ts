import { NextRequest, NextResponse } from 'next/server';
import { generateDiaryFlashcards } from '@/lib/ai/diary-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalText, optimizedText, upgradedText, level } = body;

    if (!originalText) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      );
    }

    const flashcards = await generateDiaryFlashcards(
      originalText,
      optimizedText,
      upgradedText,
      level || 'B1'
    );

    return NextResponse.json(flashcards);
  } catch (error: any) {
    console.error('Flashcards API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
