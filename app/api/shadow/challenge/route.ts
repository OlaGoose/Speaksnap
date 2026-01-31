import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
import { generateDailyChallenge, generateReferenceAudio } from '@/lib/ai/shadow-service';
import type { UserLevel, PracticeMode } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Defensive: ensure request body can be parsed
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        console.error('Shadow challenge: empty request body');
        return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (e) {
      console.error('Shadow challenge: invalid request body', e);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Validate body has expected structure
    if (!body || typeof body !== 'object') {
      console.error('Shadow challenge: body is not an object', body);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    const level = (body.level ?? 'Beginner') as UserLevel;
    const mode = (body.mode ?? 'Daily') as PracticeMode;

    const challenge = await generateDailyChallenge(level, mode);
    const { base64 } = await generateReferenceAudio(challenge.text);

    return NextResponse.json({
      topic: challenge.topic,
      text: challenge.text,
      sourceUrl: challenge.sourceUrl,
      refAudioBase64: base64,
    });
  } catch (error: unknown) {
    console.error('Shadow challenge API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
