/**
 * Shadow Reading (影子跟读) AI service.
 * Uses @google/genai for daily challenge, TTS, and accent analysis.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import type { UserLevel } from '../types';
import type {
  ShadowDailyChallenge,
  ShadowAnalysisResult,
} from '../types';
import { addWavHeader, base64ToUint8Array, blobToBase64 } from '../utils/shadowAudio';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function parseJSON(text: string): Record<string, unknown> {
  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText) as Record<string, unknown>;
  } catch (e) {
    console.error('Shadow: Failed to parse JSON', e);
    throw new Error('Invalid response format from AI');
  }
}

export async function generateDailyChallenge(
  level: UserLevel
): Promise<ShadowDailyChallenge> {
  if (!ai) throw new Error('Gemini API key not configured');

  const levelPrompt =
    level === 'Beginner'
      ? 'Use simple vocabulary (A2). Short, clear sentences.'
      : level === 'Intermediate'
        ? 'Use moderate vocabulary (B2). Natural, everyday sentences.'
        : 'Use advanced vocabulary (C1). Nuanced, idiomatic expressions.';

  const prompt = `
You are creating a short reading passage for an English learner. Do NOT use web search.

Generate a random, realistic scenario from Western daily life. Pick ONE theme each time from a wide range, for example:
- At a café or coffee shop (ordering, small talk with barista)
- Grocery shopping or at a market
- At the pharmacy or doctor's office
- At the bank, post office, or DMV
- Chatting with a neighbor or colleague
- Asking for directions or taking public transport
- At the gym, park, or booking a class
- Restaurant: reserving a table, ordering, or paying the bill
- Returning an item or dealing with customer service
- Weather, weekend plans, or casual catch-up with a friend

Rules:
- Write exactly 3 sentences that form a coherent mini-scenario. Sound like natural American or British everyday speech.
- Target: ${level} learner. ${levelPrompt}
- Vary the theme randomly; cover different situations over time.

Output strictly valid JSON only (no markdown, no explanation):
{ "topic": "short theme name, e.g. Coffee shop order", "text": "Your three sentences here." }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { httpOptions: { timeout: 30000 } },
  });

  const text = response.text;
  if (!text) throw new Error('No content generated');

  const data = parseJSON(text) as { topic: string; text: string };
  return { topic: data.topic, text: data.text, sourceUrl: '' };
}

export async function generateReferenceAudio(
  text: string
): Promise<{ base64: string }> {
  if (!ai) throw new Error('Gemini API key not configured');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
      httpOptions: { timeout: 60000 },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio || typeof base64Audio !== 'string')
    throw new Error('Failed to generate audio');

  const pcmData = base64ToUint8Array(base64Audio);
  const wavBuffer = addWavHeader(pcmData, 24000);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const wavBase64 = await blobToBase64(blob);

  return { base64: wavBase64 };
}

export async function analyzeShadowReading(
  userAudioBase64: string,
  userMimeType: string,
  referenceAudioBase64: string,
  referenceText: string
): Promise<ShadowAnalysisResult> {
  if (!ai) throw new Error('Gemini API key not configured');

  const cleanMimeType = userMimeType.split(';')[0].trim();

  const prompt = `
    Role: Strict Dialect Coach.
    Reference Text: "${referenceText}"

    Task: Compare the "User Audio" directly against the "Reference Audio" (Native Speaker).
    Identify differences in pronunciation, intonation, and rhythm. Be strict.

    Output strictly valid JSON (no markdown) with this structure:
    {
      "words": [{ "word": "string", "status": "good"|"average"|"poor", "issue": "string", "phonetic": "string" }],
      "score": number (0-100),
      "fluency": "string",
      "pronunciation": { "strengths": ["string"], "weaknesses": ["string"] },
      "intonation": "string",
      "suggestions": "string"
    }
  `;

  // Note: Use gemini-3-flash-preview for stable audio analysis; 60s timeout
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Reference Audio (Native Speaker):' },
          { inlineData: { mimeType: 'audio/wav', data: referenceAudioBase64 } },
          { text: 'User Audio (Student):' },
          { inlineData: { mimeType: cleanMimeType, data: userAudioBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: { httpOptions: { timeout: 60000 } },
  });

  const responseText = response.text;
  if (!responseText) throw new Error('Analysis failed');

  return parseJSON(responseText) as unknown as ShadowAnalysisResult;
}
