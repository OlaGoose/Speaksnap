/**
 * Diary Service Layer
 * Comprehensive diary analysis with single AI call
 */

import { DoubaoProvider } from './doubao';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize providers
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

/**
 * Complete Diary Analysis - Single comprehensive call
 */
export async function analyzeCompleteDiary(text: string): Promise<{
  overallScore: number;
  overallLevel: string;
  summary: string;
  stats: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    uniqueWords: number;
  };
  strengths: string[];
  improvements: string[];
  grammarFocus: string[];
  sentenceAnalysis: Array<{
    original: string;
    score: number;
    errors: Array<{
      error: string;
      reason: string;
      correction: string;
    }>;
    corrected: string;
  }>;
  optimized: string;
  upgradedVersion: string;
  patterns: Array<{
    pattern: string;
    explanation: string;
    example: string;
  }>;
  flashcards: Array<{
    term: string;
    phonetic: string;
    translation: string;
    definition: string;
    example: string;
    nativeUsage: string;
  }>;
}> {
  // Limit text length to prevent overly long responses
  const maxTextLength = 2000;
  const truncatedText = text.length > maxTextLength ? text.substring(0, maxTextLength) + '...' : text;
  
  const prompt = `
Analyze this diary entry as an English writing coach:

"${truncatedText}"

Return ONLY valid JSON:
{
  "overallScore": 7,
  "overallLevel": "B1",
  "summary": "One sentence assessment",
  "stats": {"wordCount": 150, "sentenceCount": 8, "avgSentenceLength": 18, "uniqueWords": 95},
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement area 1", "Area 2"],
  "grammarFocus": ["Grammar 1", "Grammar 2"],
  "sentenceAnalysis": [
    {"original": "sentence", "score": 5, "errors": [{"error": "wrong", "reason": "why", "correction": "right"}], "corrected": "fixed sentence"}
  ],
  "optimized": "FULL corrected version with ALL sentences - must be complete text",
  "upgradedVersion": "FULL advanced version with sophisticated vocabulary - must be complete text",
  "patterns": [{"pattern": "template", "explanation": "usage", "example": "example"}],
  "flashcards": [
    {
      "term": "word or phrase",
      "phonetic": "/IPA/",
      "translation": "中文翻译",
      "definition": "DETAILED explanation: part of speech, meaning, usage context, formality level",
      "example": "Full natural example sentence",
      "nativeUsage": "How natives use it: common collocations, situations, tips, mistakes to avoid"
    }
  ]
}

REQUIREMENTS:
1. Calculate accurate stats
2. List 2-3 specific strengths
3. List 2-3 actionable improvements
4. List 2-3 grammar topics
5. Analyze max 5 key sentences
6. "optimized" = COMPLETE corrected full text
7. "upgradedVersion" = COMPLETE advanced full text
8. 3-5 flashcards with RICH detailed content
9. Each flashcard must be educational and comprehensive
10. Valid complete JSON only
`;

  let lastError: any = null;

  // Try Doubao
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Analyzing complete diary with Doubao...');
      let responseText: string | undefined;
      
      const response = await doubao.chat(
        [
          { role: 'system', content: 'You are an English writing coach. Return ONLY valid JSON. Keep all responses concise. Maximum 3000 tokens total.' },
          { role: 'user', content: prompt },
        ],
        {
          maxTokens: 3000, // Limit to prevent truncation
          temperature: 0.2, // Lower temperature for more consistent JSON
        }
      );
      
      responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      
      console.log('📝 Doubao response length:', responseText.length);
      const parsed = DoubaoProvider.parseJSONResponse(responseText);
      console.log('✅ Doubao JSON parsed successfully');
      return parsed;
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao analysis failed:', error.message);
      // Don't log responseText here as it may not be in scope
    }
  }

  // Try OpenAI
  if (AI_PROVIDER === 'auto' && openai) {
    try {
      console.log('🔄 Trying OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an English learning assistant. Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.3,
      });
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      // Don't log API key errors as warnings
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ OpenAI skipped (API key issue)');
      } else {
        console.warn('❌ OpenAI analysis failed:', error.message);
      }
    }
  }

  // Try Gemini
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini...');
      const model = gemini.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { 
          responseMimeType: 'application/json',
          maxOutputTokens: 4000,
          temperature: 0.3,
        },
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      // Don't log quota errors as warnings
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        console.log('ℹ️ Gemini skipped (quota exceeded)');
      } else {
        console.warn('❌ Gemini analysis failed:', error.message);
      }
    }
  }

  // Provide user-friendly error message
  const errorMessage = lastError?.message || 'All AI providers failed';
  if (errorMessage.includes('JSON') || errorMessage.includes('incomplete')) {
    throw new Error('The diary entry is too long and the response was truncated. Please try with a shorter entry (under 2000 characters) or split it into multiple entries.');
  }
  throw new Error(errorMessage);
}

// Keep legacy functions for backward compatibility if needed
/**
 * Phase 0: Generate outline based on topic
 */
export async function generateDiaryOutline(
  topic: string,
  level: string
): Promise<{ keywords: string[]; events: string[]; details: string[] }> {
  const prompt = `
You are an English learning diary assistant. The user wants to write about: "${topic}"
Their English level is: ${level}

Generate a 3-layer outline to help them structure their thoughts:

1. Core Keywords: 5-7 key words/phrases related to the topic
2. Event Prompts: 3-4 questions/prompts about what happened
3. Details & Feelings: 3-4 prompts about specific details and emotional responses

Return JSON:
{
  "keywords": ["keyword1", "keyword2", ...],
  "events": ["What happened first?", "Then what?", ...],
  "details": ["How did you feel?", "What specific details stood out?", ...]
}
`;

  let lastError: any = null;

  // Try Doubao
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Generating outline with Doubao...');
      const response = await doubao.chat([
        { role: 'system', content: 'You are an English learning assistant. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ]);
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      return DoubaoProvider.parseJSONResponse(text);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao outline failed:', error.message);
    }
  }

  // Try OpenAI
  if (AI_PROVIDER === 'auto' && openai) {
    try {
      console.log('🔄 Trying OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an English learning assistant. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ OpenAI outline failed:', error.message);
    }
  }

  // Try Gemini
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini...');
      const model = gemini.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Gemini outline failed:', error.message);
    }
  }

  throw new Error(lastError?.message || 'All AI providers failed');
}

/**
 * Phase 2: Analyze draft and provide optimization
 */
export async function analyzeDiaryDraft(
  text: string,
  level: string
): Promise<{ analysis: any[]; optimized: string }> {
  const prompt = `
You are an English writing coach. Analyze this diary entry:

"${text}"

Student level: ${level}

Tasks:
1. Identify grammar errors, awkward expressions, and areas for improvement
2. Provide a corrected version with zero grammar errors

Return JSON:
{
  "analysis": [
    {
      "original": "the sentence with issue",
      "errorType": "grammar/word choice/expression",
      "suggestion": "how to fix it",
      "level": "basic/intermediate/advanced"
    }
  ],
  "optimized": "The complete corrected text with perfect grammar"
}
`;

  let lastError: any = null;

  // Try Doubao
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Analyzing with Doubao...');
      const response = await doubao.chat([
        { role: 'system', content: 'You are an English writing coach. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ]);
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return DoubaoProvider.parseJSONResponse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao analysis failed:', error.message);
    }
  }

  // Try OpenAI
  if (AI_PROVIDER === 'auto' && openai) {
    try {
      console.log('🔄 Trying OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an English writing coach. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ OpenAI analysis failed:', error.message);
    }
  }

  // Try Gemini
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini...');
      const model = gemini.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Gemini analysis failed:', error.message);
    }
  }

  throw new Error(lastError?.message || 'All AI providers failed');
}

/**
 * Phase 3: Upgrade text to +30% difficulty
 */
export async function upgradeDiaryText(
  text: string,
  level: string
): Promise<{
  localUpgrades: Array<{ original: string; upgraded: string; explanation: string }>;
  fullUpgrade: string;
  explanation: string;
}> {
  const prompt = `
You are an English writing upgrade assistant. Take this diary entry and enhance it by 30% difficulty:

"${text}"

Current level: ${level}

Tasks:
1. Identify 2-3 sentences that can be upgraded with more complex structures or advanced vocabulary
2. Provide a complete upgraded version of the entire text

Return JSON:
{
  "localUpgrades": [
    {
      "original": "simple sentence",
      "upgraded": "enhanced version with complex structure",
      "explanation": "why this is better (what grammar/vocab was upgraded)"
    }
  ],
  "fullUpgrade": "Complete upgraded text with all improvements",
  "explanation": "Overall summary of improvements made"
}
`;

  let lastError: any = null;

  // Try Doubao
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Upgrading with Doubao...');
      const response = await doubao.chat([
        { role: 'system', content: 'You are an English writing upgrade assistant. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ]);
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return DoubaoProvider.parseJSONResponse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao upgrade failed:', error.message);
    }
  }

  // Try OpenAI
  if (AI_PROVIDER === 'auto' && openai) {
    try {
      console.log('🔄 Trying OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an English writing upgrade assistant. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ OpenAI upgrade failed:', error.message);
    }
  }

  // Try Gemini
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini...');
      const model = gemini.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Gemini upgrade failed:', error.message);
    }
  }

  throw new Error(lastError?.message || 'All AI providers failed');
}

/**
 * Phase 4: Generate flashcards from diary content
 */
export async function generateDiaryFlashcards(
  originalText: string,
  optimizedText: string,
  upgradedText: string,
  level: string
): Promise<{ flashcards: any[] }> {
  const prompt = `
You are a flashcard generator. Extract key learning points from these diary versions:

Original: "${originalText}"
Optimized: "${optimizedText}"
Upgraded: "${upgradedText || optimizedText}"

Student level: ${level}

Extract 5-8 flashcards covering:
- New/advanced vocabulary
- Useful phrases and expressions
- Complex sentence patterns

Return JSON:
{
  "flashcards": [
    {
      "type": "vocabulary/phrase/pattern",
      "term": "the word/phrase/pattern",
      "phonetic": "IPA if applicable",
      "translation": "Chinese translation",
      "example": "example sentence from the diary",
      "level": "basic/intermediate/advanced",
      "notes": "usage notes",
      "nativeUsage": "how natives use it"
    }
  ]
}
`;

  let lastError: any = null;

  // Try Doubao
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Generating flashcards with Doubao...');
      const response = await doubao.chat([
        { role: 'system', content: 'You are a flashcard generator. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ]);
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return DoubaoProvider.parseJSONResponse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao flashcards failed:', error.message);
    }
  }

  // Try OpenAI
  if (AI_PROVIDER === 'auto' && openai) {
    try {
      console.log('🔄 Trying OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a flashcard generator. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) throw new Error('Empty response');
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ OpenAI flashcards failed:', error.message);
    }
  }

  // Try Gemini
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini...');
      const model = gemini.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Gemini flashcards failed:', error.message);
    }
  }

  throw new Error(lastError?.message || 'All AI providers failed');
}
