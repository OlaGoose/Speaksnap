import { NextRequest, NextResponse } from 'next/server';
import { generateReferenceAudio } from '@/lib/ai/shadow-service';

export const maxDuration = 60;

/** Generate American male reference audio for textbook lesson text. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const voiceName = typeof body?.voiceName === 'string' ? body.voiceName : 'Puck';

    if (!text) {
      return NextResponse.json({ error: 'Missing or empty text' }, { status: 400 });
    }

    const { base64 } = await generateReferenceAudio(text, voiceName);
    return NextResponse.json({ refAudioBase64: base64 });
  } catch (error: unknown) {
    console.error('Textbook ref-audio API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate reference audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
