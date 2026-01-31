/**
 * Shadow Reading (影子跟读) AI service.
 * Uses @google/genai for daily challenge, TTS, and accent analysis.
 * Doubao is used as fallback for challenge text when Gemini times out or is unavailable.
 */

import { GoogleGenAI, Modality, createPartFromUri, createUserContent } from '@google/genai';
import { DoubaoProvider } from './doubao';
import type {
  UserLevel,
  PracticeMode,
  ShadowDailyChallenge,
  ShadowAnalysisResult,
} from '@/lib/types';
import { addWavHeader, arrayBufferToBase64, base64ToUint8Array } from '@/lib/utils/shadowAudio';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const doubaoConfig = {
  apiKey: process.env.NEXT_DOUBAO_API_KEY || '',
  endpoint: process.env.NEXT_DOUBAO_CHAT_ENDPOINT || '',
  model: process.env.NEXT_DOUBAO_CHAT_MODEL || '',
};
const doubao =
  doubaoConfig.apiKey && doubaoConfig.endpoint && doubaoConfig.model
    ? new DoubaoProvider(doubaoConfig)
    : null;

function parseJSON(text: string): Record<string, unknown> {
  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText) as Record<string, unknown>;
  } catch (e) {
    console.error('Shadow: Failed to parse JSON', e);
    throw new Error('Invalid response format from AI');
  }
}

export interface ShadowSourceFile {
  uri: string;
  mimeType?: string;
  displayName?: string;
}

export async function generateDailyChallenge(
  level: UserLevel,
  mode: PracticeMode = 'Daily',
  sourceFile?: ShadowSourceFile | null
): Promise<ShadowDailyChallenge> {
  if (!ai && !doubao) {
    throw new Error(
      'No AI provider configured for Shadow. Set NEXT_PUBLIC_GEMINI_API_KEY or Doubao env vars (NEXT_DOUBAO_API_KEY, NEXT_DOUBAO_CHAT_ENDPOINT, NEXT_DOUBAO_CHAT_MODEL).'
    );
  }

  // IELTS + uploaded file: extract 3 sentences from document (Gemini only)
  if (mode === 'IELTS' && sourceFile?.uri && ai) {
    const mimeType = sourceFile.mimeType || 'application/pdf';
    const extractPrompt = `
You are given a document (e.g. PDF or text). Extract exactly 3 consecutive or representative sentences from it that are suitable for shadow reading practice (clear, complete sentences; no dialogue).

Rules:
- Output strictly valid JSON only (no markdown, no explanation): { "topic": "short label describing the excerpt", "text": "Sentence one. Sentence two. Sentence three." }
- topic: short label (e.g. "Reading excerpt", or the document title/section).
- text: exactly 3 sentences from the document, unchanged from the original.
`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: createUserContent([
          createPartFromUri(sourceFile.uri, mimeType),
          extractPrompt,
        ]),
        config: { httpOptions: { timeout: 60000 } },
      });
      const text = response.text;
      if (text) {
        const data = parseJSON(text) as { topic?: string; text?: string };
        const topic = data?.topic ?? sourceFile.displayName ?? 'Reading excerpt';
        const textContent = data?.text ?? '';
        if (!textContent) throw new Error('No text extracted from document');
        return { topic, text: textContent, sourceUrl: '' };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Shadow IELTS file extract failed:', msg);
      throw new Error(`Failed to extract sentences from document: ${msg}`);
    }
  }

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

  // Try Gemini first
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { httpOptions: { timeout: 60000 } },
      });
      const text = response.text;
      if (text) {
        const data = parseJSON(text) as { topic: string; text: string };
        return { topic: data.topic, text: data.text, sourceUrl: '' };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('❌ Shadow challenge Gemini failed (trying Doubao fallback):', msg);
    }
  }

  // Doubao fallback when Gemini times out or is unavailable
  if (doubao) {
    try {
      console.log('🔄 Shadow challenge using Doubao fallback...');
      const response = await doubao.chat(
        [{ role: 'user', content: prompt }],
        { temperature: 0.7, maxTokens: 512 }
      );
      const text = response.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from Doubao');
      const parsed = DoubaoProvider.parseJSONResponse(text) as { topic?: string; text?: string };
      const topic = parsed?.topic ?? 'Passage';
      const textContent = parsed?.text ?? '';
      if (!textContent) throw new Error('No text in Doubao response');
      console.log('✅ Shadow challenge Doubao fallback successful');
      return { topic, text: textContent, sourceUrl: '' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('❌ Shadow challenge Doubao fallback failed:', msg);
      throw new Error(
        'Failed to generate Shadow challenge. Gemini and Doubao both failed. Please check your network and API keys.'
      );
    }
  }

  throw new Error('No AI provider available for Shadow challenge.');
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

export interface RecommendedVideo {
  url: string;
  videoId: string;
  title: string;
  summary: string;
  relevanceScore?: number;
}

/**
 * Recommend a YouTube video from PDF based on shadow reading context.
 * Uses Gemini's document understanding to extract and match videos.
 */
export async function recommendYouTubeVideo(
  practiceText: string,
  weaknesses: string[] = [],
  pdfFileUri?: string
): Promise<RecommendedVideo | null> {
  if (!ai) {
    console.warn('Gemini API key not configured for video recommendation');
    return null;
  }

  const fileUri = pdfFileUri || process.env.SHADOW_YOUTUBE_PDF_URI;
  if (!fileUri) {
    console.warn('SHADOW_YOUTUBE_PDF_URI not configured');
    return null;
  }

  const weaknessContext = weaknesses.length > 0
    ? `\nUser's pronunciation weaknesses: ${weaknesses.join(', ')}`
    : '';

  const prompt = `
You are given a PDF document containing YouTube video recommendations. Each segment has this format:
=== Segment XX ===
URL: [YouTube URL]
Summary: [Video description]

Your task:
1. Read the entire PDF and extract all video segments
2. Analyze the user's shadow reading practice context:
   - Practice text: "${practiceText}"${weaknessContext}
3. Find the MOST relevant video that matches:
   - Topic similarity (e.g., if practice is about coffee, recommend coffee-related video)
   - Learning needs (e.g., if weakness is intonation, recommend videos with clear speech patterns)
   - Practical scenarios (prefer real-world conversation videos)

Output STRICTLY valid JSON (no markdown, no explanation):
{
  "url": "full YouTube URL",
  "videoId": "YouTube video ID (e.g., jhEtBuuYNj4)",
  "title": "descriptive title based on summary (max 50 chars)",
  "summary": "original summary from PDF",
  "relevanceScore": number (0-100, how well it matches the context)
}

If no suitable video found, output: {"url": "", "videoId": "", "title": "", "summary": "", "relevanceScore": 0}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: createUserContent([
        createPartFromUri(fileUri, 'application/pdf'),
        prompt,
      ]),
      config: { httpOptions: { timeout: 60000 } },
    });

    const text = response.text;
    if (!text) {
      console.warn('Empty response from video recommendation');
      return null;
    }

    const data = parseJSON(text) as unknown as RecommendedVideo;
    
    // Validate response
    if (!data.url || !data.videoId || data.relevanceScore === 0) {
      console.warn('No suitable video found in PDF');
      return null;
    }

    console.log('✅ Recommended video:', data.title, '(score:', data.relevanceScore, ')');
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ Video recommendation failed:', msg);
    return null;
  }
}
