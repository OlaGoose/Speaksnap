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
 * Complete Diary Analysis - Single comprehensive call with detailed feedback
 */
export async function analyzeCompleteDiary(text: string): Promise<{
  // 总体评分（按真实英语能力维度）
  dimensions: {
    contentExpression: { score: number; comment: string };
    grammarAccuracy: { score: number; comment: string };
    vocabularyNaturalness: { score: number; comment: string };
    englishThinking: { score: number; comment: string };
  };
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
  // 逐句详细分析
  sentenceAnalysis: Array<{
    original: string;
    isCorrect: boolean;
    issues: Array<{
      errorText: string;
      errorType: string;
      reason: string;
      correction: string;
      explanation: string;
    }>;
    naturalExpression: string;
    thinkingTips?: string;
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
You are an expert English writing coach. Analyze this diary entry with EXTREME DETAIL and provide actionable feedback.

DIARY TEXT:
"${truncatedText}"

Return ONLY valid JSON with this EXACT structure:

{
  "dimensions": {
    "contentExpression": {
      "score": 9,
      "comment": "非常有思想，有反思，有逻辑，有故事性"
    },
    "grammarAccuracy": {
      "score": 4,
      "comment": "句法错误较多，时态/搭配/介词问题明显"
    },
    "vocabularyNaturalness": {
      "score": 3,
      "comment": "典型中式英语搭配（spent time to do, expend body...）"
    },
    "englishThinking": {
      "score": 6,
      "comment": "已经在用英语组织复杂思考，但表达还没'英语化'"
    }
  },
  "overallScore": 55,
  "overallLevel": "B1",
  "summary": "内容丰富有深度，但语法和表达存在大量中式英语问题，需要系统改进",
  "stats": {"wordCount": 150, "sentenceCount": 10, "avgSentenceLength": 15, "uniqueWords": 95},
  "strengths": ["思想深刻，有反思能力", "叙事逻辑清晰", "已开始用英语组织复杂思维"],
  "improvements": ["时态准确性（过去/现在时混用）", "词组搭配自然度（中式直译痕迹明显）", "介词和冠词使用"],
  "grammarFocus": ["spend time doing (not to do)", "动词搭配与介词", "时态一致性"],
  "sentenceAnalysis": [
    {
      "original": "Last week, my life was chaos.",
      "isCorrect": false,
      "issues": [
        {
          "errorText": "life was chaos",
          "errorType": "词性搭配错误",
          "reason": "chaos是名词，不能直接作表语，需要用形容词chaotic",
          "correction": "my life was chaotic",
          "explanation": "英语中"生活是混乱的"应该用形容词chaotic，不能说"生活是混乱"（名词）"
        }
      ],
      "naturalExpression": "Last week, my life was chaotic.",
      "thinkingTips": "记住：be动词后面通常接形容词，不是名词"
    },
    {
      "original": "I spent plenty of time to do irrelevant things.",
      "isCorrect": false,
      "issues": [
        {
          "errorText": "spent time to do",
          "errorType": "固定搭配错误",
          "reason": "spend time的固定搭配是doing，不是to do",
          "correction": "spent time doing",
          "explanation": "spend time/money + doing something 是固定用法"
        },
        {
          "errorText": "irrelevant things",
          "errorType": "用词不自然",
          "reason": "irrelevant通常指"不相关的"，这里想表达"无意义的"应该用meaningless/unimportant",
          "correction": "meaningless things",
          "explanation": "irrelevant = 不相关的；meaningless = 无意义的"
        }
      ],
      "naturalExpression": "I spent a lot of time doing meaningless things.",
      "thinkingTips": "spend time doing是固定搭配，必须记住！"
    }
  ],
  "optimized": "COMPLETE corrected text - MUST include ALL sentences with 0 grammar errors, keeping original meaning and structure",
  "upgradedVersion": "COMPLETE advanced text - MUST include ALL sentences with sophisticated vocabulary and complex structures",
  "patterns": [
    {"pattern": "spend + time/money + doing", "explanation": "表示花费时间/金钱做某事", "example": "I spent two hours preparing dinner."},
    {"pattern": "come up with (an idea)", "explanation": "想出、提出（主意）", "example": "She came up with a brilliant solution."}
  ],
  "flashcards": [
    {
      "term": "chaotic",
      "phonetic": "/keɪˈɑːtɪk/",
      "translation": "混乱的，无秩序的",
      "definition": "形容词，表示完全无秩序、混乱的状态。正式和非正式场合都可用，常用来描述生活、场面、局势等。",
      "example": "My schedule has been chaotic this week with back-to-back meetings.",
      "nativeUsage": "常见搭配：chaotic situation/life/scene。Native speakers经常用这个词描述忙乱的生活状态。避免说'life was chaos'（名词误用）。"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. **Dimensions**: Score each dimension 1-10 with Chinese comment
2. **Sentence Analysis**: 
   - Analyze EVERY important sentence (max 10-12 sentences)
   - For incorrect sentences: list ALL issues with detailed explanations
   - Always provide "naturalExpression" - how natives would say it
   - Add "thinkingTips" for key learning points
3. **Issues Format**:
   - errorText: the exact wrong part
   - errorType: grammar/vocabulary/expression/thinking
   - reason: WHY it's wrong (in Chinese for clarity)
   - correction: the right way
   - explanation: detailed explanation in Chinese
4. **optimized**: COMPLETE text with ALL original sentences corrected (保持原结构)
5. **upgradedVersion**: COMPLETE advanced version (提升难度但保持意思)
6. **Patterns**: 3-5 reusable sentence patterns from the corrections
7. **Flashcards**: 5-8 cards focusing on key mistakes and improvements
8. Stats must be accurate
9. Return VALID JSON only - no markdown, no extra text
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
      console.log('📊 Parsed data keys:', Object.keys(parsed));
      console.log('📊 Has dimensions:', !!parsed.dimensions);
      console.log('📊 Has sentenceAnalysis:', !!parsed.sentenceAnalysis);
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
      const parsed = JSON.parse(responseText);
      console.log('✅ Gemini JSON parsed successfully');
      console.log('📊 Parsed data keys:', Object.keys(parsed));
      return parsed;
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
