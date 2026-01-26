/**
 * AI Service Layer
 * Handles all AI interactions with automatic fallback between providers
 */

import { DoubaoProvider, DoubaoMessage } from './doubao';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AnalyzeImageResponse,
  DialogueResponse,
  DiaryProcessResult,
  UserLevel,
} from '../types';

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
 * Analyze image to create a learning scenario
 */
export async function analyzeScene(
  base64Image: string,
  level: UserLevel,
  location?: { lat: number; lng: number }
): Promise<AnalyzeImageResponse> {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayPart =
    now.getHours() >= 18 || now.getHours() < 6 ? 'Night/Evening' : 'Daytime';

  const locationContext = location
    ? `User location: (Lat: ${location.lat}, Lng: ${location.lng}). Use this to identify landmarks or local context.`
    : 'No GPS data available.';

  const prompt = `
You are an English learning scenario generator. Analyze this image and create a realistic, immersive scenario.

Context:
- Student Level: ${level}
- Current Time: ${timeStr} (${dayPart})
- ${locationContext}

Requirements:
1. Be EXTREMELY realistic - if it's nighttime, suggest nighttime activities
2. Identify specific elements in the image (signs, objects, lighting)
3. Create natural conversation starters appropriate for the time and place
4. Match difficulty to ${level} level

Return JSON:
{
  "location": "Specific place name from image",
  "situation": "Why would we be talking here?",
  "difficulty": "A1/A2/B1/B2/C1/C2 based on ${level}",
  "role_name": "Character role (e.g., Barista, Local, Clerk)",
  "context": "Character personality and scene instructions",
  "first_line": "AI's natural opening line",
  "user_hints": ["3 realistic response options"]
}
  `;

  let lastError: any = null;

  // Skip Doubao for image analysis - it doesn't support vision API
  // Doubao will be skipped in favor of OpenAI and Gemini which have proper vision support

  // Try OpenAI (prioritize for image analysis)
  if ((AI_PROVIDER === 'openai' || AI_PROVIDER === 'auto') && openai) {
    try {
      console.log('🔄 Analyzing image with OpenAI Vision...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a scenario generator. Always return valid JSON.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');

      console.log('✅ OpenAI Vision analysis successful');
      return validateAnalysisResponse(JSON.parse(text));
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key') || error.message?.includes('401')) {
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
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      return validateAnalysisResponse(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Gemini analysis failed:', error.message);
    }
  }

  throw new Error(
    lastError?.message || 'All AI providers failed to analyze the image'
  );
}

/**
 * Analyze audio to create scenario
 */
export async function analyzeAudio(
  base64Audio: string,
  level: UserLevel,
  location?: { lat: number; lng: number }
): Promise<AnalyzeImageResponse> {
  // For now, use text-only analysis
  // In production, you'd transcribe audio first using Whisper/etc
  const prompt = `
User spoke a request. Create a realistic scenario based on:
- Level: ${level}
- Location: ${location ? `Lat ${location.lat}, Lng ${location.lng}` : 'Unknown'}

Return same JSON format as image analysis.
  `;

  // Use same fallback logic as analyzeScene
  // Implementation similar to above...
  return {
    location: 'User Request',
    situation: 'Practice conversation',
    difficulty: level === 'Beginner' ? 'A1' : level === 'Intermediate' ? 'B1' : 'C1',
    role_name: 'Practice Partner',
    context: 'Be helpful and encouraging',
    first_line: 'Hello! How can I help you practice today?',
    user_hints: ['Start conversation', 'Ask a question', 'Tell me about yourself'],
  };
}

/**
 * Continue dialogue conversation
 */
export async function continueDialogue(
  history: Array<{ role: string; text: string }>,
  userText: string,
  scenarioContext: string,
  level: UserLevel
): Promise<DialogueResponse> {
  const systemPrompt = `
You are an English conversation tutor conducting a roleplay dialogue exercise.

📍 SCENARIO CONTEXT:
${scenarioContext}

🎯 YOUR ROLE:
- You are the conversation partner in this scenario (e.g., shopkeeper, friend, colleague)
- Engage in natural, realistic conversation appropriate for the scenario
- Keep responses conversational and authentic to the situation

👤 STUDENT LEVEL: ${level}
- Adapt language complexity to match their level
- Be encouraging and supportive
- Provide helpful feedback on their English

📝 DIALOGUE FORMAT:
When the conversation starts, establish your character role clearly. For example:
- "Hi! Welcome to the coffee shop. What can I get you today?"
- "Hey there! Nice weather today, isn't it?"
- "Good morning! I see you're interested in this product."

💬 EVALUATION CRITERIA:
- Grammar accuracy
- Vocabulary appropriateness
- Natural expression
- Scenario relevance

⚠️ IMPORTANT:
- Respond as the character in the scenario
- Keep the conversation flowing naturally
- End the conversation when it reaches a natural conclusion
- Provide 3 helpful suggestions for the student's next possible response

Return JSON:
{
  "feedback": {
    "score": 0-100,
    "comment": "Brief, encouraging feedback",
    "correction": "Grammar correction if needed",
    "better_alternative": "More natural/native way to express the same idea"
  },
  "next_response": "Your character's natural reply in the scenario",
  "next_hints": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "is_finished": false
}
  `;

  const messages: DoubaoMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({
      role: (h.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: h.text,
    })),
    { role: 'user', content: userText },
  ];

  let lastError: any = null;

  // Try Doubao
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Trying Doubao dialogue...');
      const response = await doubao.chat(messages);
      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('Empty response from Doubao');
      }
      
      console.log('📝 Doubao response received, length:', text.length);
      const parsed = DoubaoProvider.parseJSONResponse(text);
      console.log('✅ Doubao JSON parsed successfully');
      return validateDialogueResponse(parsed);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao dialogue failed:', error.message);
      if (error.stack) {
        console.warn('Stack trace:', error.stack);
      }
    }
  }

  // Try OpenAI
  if (AI_PROVIDER === 'auto' && openai) {
    try {
      console.log('🔄 Trying OpenAI dialogue...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI');
      return validateDialogueResponse(JSON.parse(text));
    } catch (error: any) {
      lastError = error;
      // Don't log API key errors as warnings - they're configuration issues
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ OpenAI skipped (API key issue)');
      } else {
        console.warn('❌ OpenAI dialogue failed:', error.message);
      }
    }
  }

  // Try Gemini
  if (gemini) {
    try {
      console.log('🔄 Trying Gemini dialogue...');
      const model = gemini.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
        systemInstruction: systemPrompt,
      });

      // Build conversation history for Gemini
      // Gemini requires alternating user/model messages, starting with user
      const geminiHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      
      // Process history, ensuring proper alternation
      for (const h of history) {
        const role = h.role === 'model' ? 'model' : 'user';
        
        // Skip consecutive same roles (shouldn't happen, but be defensive)
        if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === role) {
          console.warn('⚠️ Skipping duplicate role in history:', role);
          continue;
        }
        
        geminiHistory.push({
          role,
          parts: [{ text: h.text }],
        });
      }
      
      // If history exists and doesn't start with user, we need to handle it
      // If history is empty or starts with model, we'll use generateContent instead
      if (geminiHistory.length === 0 || geminiHistory[0].role === 'user') {
        // Use startChat when history is valid
        const chat = model.startChat({
          history: geminiHistory,
        });
        
        const result = await chat.sendMessage(userText);
        const text = result.response.text();
        
        // Parse JSON response
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in response');
          parsed = JSON.parse(jsonMatch[0]);
        }
        
        return validateDialogueResponse(parsed);
      } else {
        // History starts with model - use generateContent with full context
        const conversationText = [
          systemPrompt,
          ...geminiHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.parts[0].text}`),
          `User: ${userText}`,
        ].join('\n\n');
        
        const result = await model.generateContent(conversationText);
        const text = result.response.text();
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in response');
          parsed = JSON.parse(jsonMatch[0]);
        }
        
        return validateDialogueResponse(parsed);
      }
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Gemini dialogue failed:', error.message);
      if (error.stack) {
        console.warn('Stack trace:', error.stack);
      }
    }
  }

  throw new Error(lastError?.message || 'All AI providers failed');
}

/**
 * Process diary entry
 */
export async function processDiaryEntry(
  diaryText: string
): Promise<DiaryProcessResult> {
  const prompt = `
Analyze this English learner's diary entry:
"${diaryText}"

Tasks:
1. Extract the intended meaning (ignoring grammar errors)
2. Create 3 native-level rewrites (Casual, Professional, Expressive)
3. Extract 2-3 reusable sentence patterns
4. Generate 3-5 vocabulary flashcards with Chinese translations

Return JSON:
{
  "semantic_summary": "What they meant to say",
  "rewrites": ["casual version", "professional version", "expressive version"],
  "extracted_patterns": [
    {
      "pattern": "Despite [X], I still [Y]",
      "explanation": "Shows contrast",
      "example": "Despite being tired, I still finished my work",
      "tags": ["contrast", "perseverance"]
    }
  ],
  "flashcards": [
    {
      "term": "word/phrase",
      "phonetic": "IPA",
      "translation": "Chinese",
      "definition": "Grammar/usage explanation",
      "example": "Example sentence",
      "native_usage": "How natives use it",
      "video_ids": ["YouTube ID 1", "YouTube ID 2"]
    }
  ]
}
  `;

  // Try providers with fallback
  let lastError: any = null;

  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      const response = await doubao.chat([
        { role: 'system', content: 'You are an English learning assistant. Return valid JSON.' },
        { role: 'user', content: prompt },
      ]);
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');
      return DoubaoProvider.parseJSONResponse(text);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao diary processing failed:', error.message);
    }
  }

  // Fallback to OpenAI/Gemini...
  throw new Error(lastError?.message || 'Diary processing failed');
}

// Validation helpers
function validateAnalysisResponse(data: any): AnalyzeImageResponse {
  return {
    location: data?.location || 'Unknown Place',
    situation: data?.situation || 'General conversation',
    difficulty: data?.difficulty || 'A1',
    role_name: data?.role_name || 'Partner',
    context: data?.context || 'Be friendly and helpful',
    first_line: data?.first_line || 'Hello! How can I help you?',
    user_hints: Array.isArray(data?.user_hints)
      ? data.user_hints
      : ['Hello', 'Help me', 'Goodbye'],
  };
}

function validateDialogueResponse(data: any): DialogueResponse {
  return {
    feedback: {
      score: typeof data?.feedback?.score === 'number' ? data.feedback.score : 50,
      comment: data?.feedback?.comment || 'Keep going!',
      correction: data?.feedback?.correction,
      better_alternative: data?.feedback?.better_alternative,
    },
    next_response: data?.next_response || 'Could you repeat that?',
    next_hints: Array.isArray(data?.next_hints)
      ? data.next_hints
      : ['Continue', 'Ask more'],
    is_finished: !!data?.is_finished,
  };
}

/**
 * Helper functions for text operations
 */
export async function translateText(text: string): Promise<string> {
  const prompt = `Translate to Chinese (Simplified): "${text}"`;

  try {
    if (doubao) {
      const response = await doubao.chat([{ role: 'user', content: prompt }]);
      return response.choices[0]?.message?.content || 'Translation failed';
    }
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || 'Translation failed';
    }
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  } catch (error) {
    console.error('Translation error:', error);
  }

  return 'Translation unavailable';
}

export async function optimizeText(text: string): Promise<string> {
  const prompt = `Make this English more natural and native: "${text}"`;

  try {
    if (doubao) {
      const response = await doubao.chat([{ role: 'user', content: prompt }]);
      return response.choices[0]?.message?.content || text;
    }
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || text;
    }
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  } catch (error) {
    console.error('Optimization error:', error);
  }

  return text;
}
