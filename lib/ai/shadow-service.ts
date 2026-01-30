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
import { addWavHeader, arrayBufferToBase64, base64ToUint8Array } from '../utils/shadowAudio';

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
You are creating a short reading passage for an English learner. Do NOT use web search. Do NOT write dialogue (no back-and-forth conversation, no "A said / B said").

Generate exactly one of these types at random (vary each time):
- Personal monologue: one person describing a moment, a thought, or a routine (e.g. morning ritual, a decision, a memory).
- Famous movie or speech quote: a short iconic 2–3 sentence passage that sounds like a film line or famous speech (you may invent something in that style; no need to cite).
- Article or blog snippet: 3 sentences that read like the opening of a short article (lifestyle, culture, or how-to).
- Popular science or news summary: 3 sentences that summarize a concept or a news-style fact in plain language.
- Scene description: 3 sentences describing a place or situation in Western daily life (e.g. a street, a room, a commute) as if from a book or narration.

Rules:
- Write exactly 3 sentences. No dialogue. Single voice or narrative only.
- Sound natural in American or British English. Target: ${level} learner. ${levelPrompt}
- Topic field: short label (e.g. "Morning routine", "Movie-style line", "News summary", "Street scene").

Output strictly valid JSON only (no markdown, no explanation):
{ "topic": "short label", "text": "Your three sentences here." }
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
  const wavBase64 = await arrayBufferToBase64(wavBuffer);
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
    Role: Strict Dialect Coach with Audio Timing Analysis.
    Reference Text: "${referenceText}"

    Task: 
    1. Listen to both "Reference Audio" (Native Speaker) and "User Audio" (Student).
    2. Compare pronunciation, intonation, and rhythm. Be strict.
    3. For EACH word, estimate the time position (in seconds) where it appears in BOTH audios.
    
    Output strictly valid JSON (no markdown) with this structure:
    {
      "words": [
        { 
          "word": "string", 
          "status": "good"|"average"|"poor", 
          "issue": "string", 
          "phonetic": "string",
          "refStartTime": number (seconds, e.g., 0.5),
          "refEndTime": number (seconds, e.g., 1.2),
          "userStartTime": number (seconds, e.g., 0.8),
          "userEndTime": number (seconds, e.g., 1.6)
        }
      ],
      "score": number (0-100),
      "fluency": "string",
      "pronunciation": { "strengths": ["string"], "weaknesses": ["string"] },
      "intonation": "string",
      "suggestions": "string"
    }
    
    IMPORTANT: Estimate timing accurately by listening to when each word is spoken in both audios.
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
