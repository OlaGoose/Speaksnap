/**
 * Shadow Reading (影子跟读) AI service.
 * Uses @google/genai for daily challenge, TTS, and accent analysis.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import type { UserLevel, PracticeMode } from '../types';
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
  level: UserLevel,
  mode: PracticeMode = 'Daily'
): Promise<ShadowDailyChallenge> {
  if (!ai) throw new Error('Gemini API key not configured');

  const levelPrompt =
    level === 'Beginner'
      ? 'Use simple vocabulary (A2). Short, clear sentences.'
      : level === 'Intermediate'
        ? 'Use moderate vocabulary (B2). Natural, everyday sentences.'
        : 'Use advanced vocabulary (C1). Nuanced, idiomatic expressions.';

  const modeInstructions = mode === 'IELTS'
    ? `
IELTS Mode Content:
Generate passages that reflect IELTS Speaking test topics and styles:
- Academic topics: Education, Technology, Environment, Globalization
- Social topics: Family, Culture, Work-life balance, Media
- Personal development: Hobbies, Travel, Health, Future plans
- Opinion pieces: Should require analytical thinking and detailed responses
- Use formal-to-neutral register, appropriate for IELTS Band 6-8

Content types for IELTS:
- Expert opinion excerpt: 3 sentences from an academic or professional discussing a topic
- IELTS cue card response sample: 3 sentences describing an experience/person/place
- News analysis: 3 sentences analyzing a current trend or issue
- Cultural comparison: 3 sentences comparing aspects of different cultures
- Future prediction: 3 sentences discussing likely future developments
`
    : `
Daily Life Content:
Generate passages reflecting everyday Western life:
- Personal monologue: describing a moment, thought, or routine
- Movie/speech quote: iconic 2-3 sentence passage
- Article/blog snippet: lifestyle, culture, or how-to
- Popular science/news: plain language explanation
- Scene description: Western daily life (street, room, commute)
`;

  const prompt = `
You are creating a short reading passage for an English learner. Do NOT use web search. Do NOT write dialogue.

Practice Mode: ${mode}

${modeInstructions}

Rules:
- Write exactly 3 sentences. No dialogue. Single voice or narrative only.
- Sound natural in American or British English. Target: ${level} learner. ${levelPrompt}
- Topic field: short label describing the content

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
