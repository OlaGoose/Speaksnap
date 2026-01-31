import { NextRequest, NextResponse } from 'next/server';
import { DoubaoProvider } from '@/lib/ai/doubao';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchYouTube } from '@/lib/youtube/search';
import { getCachedSearch, setCachedSearch } from '@/lib/youtube/cache';

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

Return ONLY valid JSON (no markdown):
{
  "phonetic": "string",
  "translation": "string",
  "definition": "string",
  "example": "string",
  "native_usage": "string"
}

Note: Do NOT include video_ids - those will be fetched separately.
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
        
        // Fetch YouTube videos for this word/phrase
        const videoIds = await fetchYouTubeVideos(text);
        parsed.video_ids = videoIds;
        
        console.log('✅ [Flashcard] Doubao success with', videoIds.length, 'videos');
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

        const parsed = JSON.parse(responseText);
        
        // Fetch YouTube videos for this word/phrase
        const videoIds = await fetchYouTubeVideos(text);
        parsed.video_ids = videoIds;
        
        console.log('✅ [Flashcard] OpenAI success with', videoIds.length, 'videos');
        return NextResponse.json(parsed);
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

        // Fetch YouTube videos for this word/phrase
        const videoIds = await fetchYouTubeVideos(text);
        parsed.video_ids = videoIds;
        
        console.log('✅ [Flashcard] Gemini success with', videoIds.length, 'videos');
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
      { error: 'AI service unavailable. Please check your API keys and try again.' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('❌ [Flashcard] API error:', error);
    const message = error?.message || 'Internal server error';
    const isUnavailable =
      message.includes('No AI provider') || message.includes('All AI providers failed');
    return NextResponse.json(
      { error: isUnavailable ? 'AI service unavailable. Please check your API keys and try again.' : message },
      { status: isUnavailable ? 503 : 500 }
    );
  }
}

/**
 * Fetch YouTube videos for a given word/phrase
 * Returns array of video IDs (max 3)
 * Uses caching to reduce API calls
 */
async function fetchYouTubeVideos(text: string): Promise<string[]> {
  try {
    // Create search query optimized for English learning
    const searchQuery = `${text} English pronunciation usage example`;
    
    // Check cache first (server-side doesn't have localStorage, but client-side will)
    const cached = getCachedSearch(searchQuery);
    if (cached && cached.videos.length > 0) {
      const videoIds = cached.videos.slice(0, 3).map(v => v.videoId);
      console.log(`💾 [Flashcard] Using cached videos (${cached.source}) for "${text}"`);
      return videoIds;
    }
    
    console.log(`🎥 [Flashcard] Searching YouTube for: "${searchQuery}"`);
    
    const result = await searchYouTube(searchQuery);
    
    if (result.error || result.videos.length === 0) {
      console.warn(`⚠️ [Flashcard] No videos found for "${text}":`, result.error);
      return [];
    }
    
    // Save to cache for future use
    setCachedSearch(searchQuery, result.videos, result.source);
    
    // Return top 3 video IDs
    const videoIds = result.videos.slice(0, 3).map(v => v.videoId);
    console.log(`✅ [Flashcard] Found ${videoIds.length} videos from ${result.source}`);
    
    return videoIds;
  } catch (error) {
    console.error(`❌ [Flashcard] YouTube search failed for "${text}":`, error);
    return []; // Return empty array on error, don't fail the entire flashcard generation
  }
}
