import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
import { generateDailyChallenge, generateReferenceAudio } from '@/lib/ai/shadow-service';
import type { UserLevel } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Defensive: ensure request body can be parsed
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Shadow challenge: invalid request body', e);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    const level = (body.level ?? 'Beginner') as UserLevel;

    const challenge = await generateDailyChallenge(level);
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
