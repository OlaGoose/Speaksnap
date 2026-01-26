import { NextRequest, NextResponse } from 'next/server';
import { DoubaoProvider } from '@/lib/ai/doubao';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize AI clients
const doubaoConfig = {
  apiKey: process.env.NEXT_DOUBAO_API_KEY || '',
  endpoint: process.env.NEXT_DOUBAO_CHAT_ENDPOINT || '',
  model: process.env.NEXT_DOUBAO_CHAT_MODEL || '',
};

const doubao =
  doubaoConfig.apiKey && doubaoConfig.endpoint
    ? new DoubaoProvider(doubaoConfig)
    : null;

const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const gemini = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

const AI_PROVIDER = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'auto').toLowerCase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, context, scenario } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const prompt = `
You are creating a comprehensive English learning flashcard.

Target Text: "${text}"
Context Sentence: "${context}"
Scenario: "${scenario}"

Generate detailed learning content with these fields:

1. **phonetic**: IPA pronunciation (e.g., /ˈwɔːtər/)
2. **translation**: Chinese (Simplified) translation
3. **definition**: Grammar-focused explanation (e.g., "Noun, used in informal contexts to mean...")
4. **example**: A natural example sentence at intermediate level
5. **native_usage**: How native speakers actually use this (idioms, collocations, common contexts)
6. **video_ids**: Array of 2-3 YouTube video IDs (11 characters each) showing this word/phrase in authentic content (movie clips, vlogs, interviews). Search for actual videos.

Return ONLY valid JSON (no markdown):
{
  "phonetic": "string",
  "translation": "string",
  "definition": "string",
  "example": "string",
  "native_usage": "string",
  "video_ids": ["string", "string"]
}
    `;

    let lastError: any = null;

    // Try Doubao first
    if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
      try {
        console.log('🔥 [Flashcard] Trying Doubao...');
        const response = await doubao.chat(
          [
            {
              role: 'system',
              content:
                'You are an English learning assistant. Always respond with valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.7 }
        );

        const responseText = response.choices[0]?.message?.content;
        if (!responseText) throw new Error('Empty response');

        const parsed = DoubaoProvider.parseJSONResponse(responseText);
        console.log('✅ [Flashcard] Doubao success');
        return NextResponse.json(parsed);
      } catch (error: any) {
        lastError = error;
        console.warn('❌ [Flashcard] Doubao failed:', error.message);
      }
    }

    // Try OpenAI
    if (AI_PROVIDER === 'auto' && openai) {
      try {
        console.log('🔄 [Flashcard] Trying OpenAI...');
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an English learning assistant. Always respond with valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });

        const responseText = response.choices[0]?.message?.content;
        if (!responseText) throw new Error('Empty response');

        console.log('✅ [Flashcard] OpenAI success');
        return NextResponse.json(JSON.parse(responseText));
      } catch (error: any) {
        lastError = error;
        console.warn('❌ [Flashcard] OpenAI failed:', error.message);
      }
    }

    // Try Gemini
    if (gemini) {
      try {
        console.log('🔄 [Flashcard] Trying Gemini...');
        const model = gemini.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { responseMimeType: 'application/json' },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found');
          parsed = JSON.parse(jsonMatch[0]);
        }

        console.log('✅ [Flashcard] Gemini success');
        return NextResponse.json(parsed);
      } catch (error: any) {
        lastError = error;
        console.warn('❌ [Flashcard] Gemini failed:', error.message);
      }
    }

    // All providers failed
    const errorMessage = lastError?.message || 'No AI provider available';
    console.error('❌ [Flashcard] All providers failed. Last error:', errorMessage);
    return NextResponse.json(
      { error: `All AI providers failed. Last error: ${errorMessage}` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('❌ [Flashcard] API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
