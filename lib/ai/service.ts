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
  PracticeMode,
} from '@/lib/types';

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
const openai = openaiKey ? new OpenAI({ 
  apiKey: openaiKey,
  timeout: 60000, // 30 seconds default timeout
  maxRetries: 2, // Retry on failure
}) : null;

const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const gemini = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

const AI_PROVIDER = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'auto').toLowerCase();

/** Error message when no AI provider is configured (map to 503 in API routes). */
export const NO_AI_PROVIDER_MESSAGE = 'No AI provider configured. Please set at least one of: NEXT_PUBLIC_GEMINI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY, or Doubao env vars.';

function ensureProviderAvailable(): void {
  if (!doubao && !gemini && !openai) {
    throw new Error(NO_AI_PROVIDER_MESSAGE);
  }
}

/**
 * Analyze image to create a learning scenario
 */
export async function analyzeScene(
  base64Image: string,
  level: UserLevel,
  location?: { lat: number; lng: number },
  mode: PracticeMode = 'Daily'
): Promise<AnalyzeImageResponse> {
  ensureProviderAvailable();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayPart =
    now.getHours() >= 18 || now.getHours() < 6 ? 'Night/Evening' : 'Daytime';

  const locationContext = location
    ? `User location: (Lat: ${location.lat}, Lng: ${location.lng}). Use this to identify landmarks or local context.`
    : 'No GPS data available.';

  const modeInstructions = mode === 'IELTS'
    ? `
IELTS Speaking Test Mode:
- Create scenarios that simulate IELTS Speaking Part 2 (Cue Card) or Part 3 (Discussion) topics
- Topics should include: Work/Study, Hobbies, Travel, Technology, Environment, Culture, Family, etc.
- AI role should be "IELTS Examiner" - ask follow-up questions, probe deeper on answers
- Goals should focus on: describing experiences, expressing opinions, comparing situations, hypothesizing
- Questions should encourage 2-3 minute responses with detailed explanations
- Evaluate fluency, vocabulary range, grammatical accuracy, and pronunciation
`
    : `
Daily Conversation Mode:
- Create realistic everyday scenarios based on the image
- Topics: shopping, dining, asking for directions, social interactions, etc.
- AI role adapts to the context (staff, friend, stranger, etc.)
- Goals focus on practical communication tasks
`;

  const prompt = `
You are an English learning scenario generator. Analyze this image and create a realistic, goal-oriented scenario.

Context:
- Student Level: ${level}
- Practice Mode: ${mode}
- Current Time: ${timeStr} (${dayPart})
- ${locationContext}

${modeInstructions}

Requirements:
1. Be EXTREMELY realistic - if it's nighttime, suggest nighttime activities
2. Identify specific elements in the image (signs, objects, lighting)
3. Create a clear conversation GOAL based on the scene type and practice mode
4. Determine WHO initiates based on scene and mode
5. Match difficulty to ${level} level

Return JSON:
{
  "location": "Specific place name from image",
  "situation": "Clear scenario goal - what needs to be accomplished",
  "difficulty": "A1/A2/B1/B2/C1/C2 based on ${level}",
  "role_name": "AI's character role",
  "context": "AI's role and behavior",
  "goals": ["Clear goal steps", "Goal 2", "Goal 3"],
  "completion_phrase": "Natural completion phrase when all goals are achieved",
  "first_line": "AI's opening line",
  "user_hints": ["3 realistic options that help achieve the first goal"]
}
  `;

  let lastError: any = null;

  // Skip Doubao for image analysis - it doesn't support vision API
  // Priority: Gemini -> OpenAI (both have proper vision support)

  // Try Gemini (prioritize for image analysis - better quality and cost)
  if ((AI_PROVIDER === 'gemini' || AI_PROVIDER === 'auto') && gemini) {
    try {
      console.log('🔄 Analyzing image with Gemini Vision...');
      const model = gemini.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      // Add timeout control (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini request timeout after 30s')), 60000);
      });

      const result = await Promise.race([
        model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
        ]),
        timeoutPromise,
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      console.log('✅ Gemini Vision analysis successful');
      return validateAnalysisResponse(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ Gemini skipped (API key issue)');
      } else if (error.message?.includes('timeout')) {
        console.warn('❌ Gemini analysis timeout');
      } else if (error.message?.includes('fetch failed')) {
        console.warn('❌ Gemini network error - check your internet connection');
      } else {
        console.warn('❌ Gemini analysis failed:', error.message);
      }
    }
  }

  // Try OpenAI as fallback
  if ((AI_PROVIDER === 'openai' || AI_PROVIDER === 'auto') && openai) {
    try {
      console.log('🔄 Trying OpenAI Vision...');
      
      // Add timeout control (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI request timeout after 30s')), 60000);
      });

      const response = await Promise.race([
        openai.chat.completions.create({
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
        }),
        timeoutPromise,
      ]);

      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response');

      console.log('✅ OpenAI Vision analysis successful');
      return validateAnalysisResponse(JSON.parse(text));
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ OpenAI skipped (API key issue)');
      } else if (error.message?.includes('timeout')) {
        console.warn('❌ OpenAI analysis timeout');
      } else if (error.message?.includes('Connection error') || error.message?.includes('fetch failed')) {
        console.warn('❌ OpenAI network error - check your internet connection');
      } else {
        console.warn('❌ OpenAI analysis failed:', error.message);
      }
    }
  }

  // Provide user-friendly error message
  const errorMsg = lastError?.message || 'All AI providers failed';
  if (errorMsg.includes('timeout')) {
    throw new Error('Image analysis timeout. Please check your internet connection and try again.');
  } else if (errorMsg.includes('fetch failed') || errorMsg.includes('Connection error') || errorMsg.includes('network error')) {
    throw new Error('Network connection failed. Please check your internet connection and try again.');
  } else if (errorMsg.includes('API key')) {
    throw new Error('AI service configuration error. Please contact support.');
  } else {
    throw new Error('Unable to analyze image. Please try again or use a different image.');
  }
}

/**
 * Transcribe audio to text
 */
async function transcribeAudio(
  base64Audio: string
): Promise<string> {
  // Extract base64 data (remove data URL prefix if present)
  const base64Data = base64Audio.includes(',') 
    ? base64Audio.split(',')[1] 
    : base64Audio;

  // Try OpenAI Whisper
  if (openai) {
    try {
      console.log('🔄 Transcribing audio with OpenAI Whisper...');
      const audioBuffer = Buffer.from(base64Data, 'base64');
      
      // Create a File object from the buffer for OpenAI SDK
      // File is available in Node.js 18+ and modern browsers
      let file: File | Blob;
      try {
        file = new File([audioBuffer], 'audio.webm', { 
          type: 'audio/webm' 
        });
      } catch {
        // Fallback to Blob if File is not available
        file = new Blob([audioBuffer], { type: 'audio/webm' });
      }
      
      const transcription = await openai.audio.transcriptions.create({
        file: file as any,
        model: 'whisper-1',
        language: 'en',
      });

      const text = transcription.text.trim();
      if (text) {
        console.log('✅ OpenAI Whisper transcription successful:', text);
        return text;
      }
    } catch (error: any) {
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ OpenAI Whisper skipped (API key issue)');
      } else {
        console.warn('❌ OpenAI Whisper transcription failed:', error.message);
        // Continue to fallback - don't throw, let analyzeAudio handle it
      }
    }
  }

  // Fallback: Cannot transcribe, return empty string
  // The analyzeAudio function will handle this gracefully
  console.warn('⚠️ Audio transcription unavailable');
  return '';
}

/**
 * Analyze audio to create scenario
 */
export async function analyzeAudio(
  base64Audio: string,
  level: UserLevel,
  location?: { lat: number; lng: number },
  mode: PracticeMode = 'Daily'
): Promise<AnalyzeImageResponse> {
  ensureProviderAvailable();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayPart =
    now.getHours() >= 18 || now.getHours() < 6 ? 'Night/Evening' : 'Daytime';

  const locationContext = location
    ? `User location: (Lat: ${location.lat}, Lng: ${location.lng}). Use this to identify landmarks or local context.`
    : 'No GPS data available.';

  let transcribedText = '';

  // Try to transcribe audio
  try {
    transcribedText = await transcribeAudio(base64Audio);
  } catch (error: any) {
    console.warn('Transcription failed, proceeding with generic scenario:', error.message);
  }

  const modeInstructions = mode === 'IELTS'
    ? `
IELTS Speaking Test Mode:
- Create IELTS Speaking Part 2/3 scenarios
- AI role: "IELTS Examiner" - professional, encouraging, asks follow-up questions
- Topics: Work, Study, Hobbies, Travel, Technology, Environment, Culture, etc.
- Encourage detailed responses (2-3 minutes), opinions, comparisons, hypotheticals
`
    : `
Daily Conversation Mode:
- Create realistic everyday scenarios
- AI role adapts to context
- Focus on practical communication
`;

  const prompt = `
You are an English learning scenario generator. ${transcribedText 
  ? `The user said: "${transcribedText}". Create a realistic scenario based on their request.`
  : 'The user made a voice request. Create a realistic, immersive scenario.'}

Context:
- Student Level: ${level}
- Practice Mode: ${mode}
- Current Time: ${timeStr} (${dayPart})
- ${locationContext}
${transcribedText ? `- User Request: "${transcribedText}"` : ''}

${modeInstructions}

Requirements:
1. Be EXTREMELY realistic - if it's nighttime, suggest nighttime activities
2. ${transcribedText ? 'Incorporate the user\'s request into the scenario naturally' : 'Create natural conversation starters appropriate for the time and place'}
3. Create a clear conversation GOAL based on practice mode
4. Make the scenario have a natural beginning, middle, and end
5. Match difficulty to ${level} level

Return JSON:
{
  "location": "Specific place name",
  "situation": "Clear scenario goal",
  "difficulty": "A1/A2/B1/B2/C1/C2 based on ${level}",
  "role_name": "Character role",
  "context": "Character personality and behavior",
  "goals": ["Specific goal step 1", "Specific goal step 2", "Specific goal step 3"],
  "completion_phrase": "Natural completion phrase",
  "first_line": "AI's natural opening line",
  "user_hints": ["3 realistic response options"]
}
  `;

  let lastError: any = null;

  // Try Doubao (priority 1)
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Trying Doubao audio analysis...');
      const response = await doubao.chat([
        { role: 'system', content: 'You are a scenario generator. Always return valid JSON.' },
        { role: 'user', content: prompt },
      ], {
        maxTokens: 4000, // Scenarios need more tokens for detailed responses
        temperature: 0.8,
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response from Doubao');
      const parsed = DoubaoProvider.parseJSONResponse(text);
      console.log('✅ Doubao audio analysis successful');
      return validateAnalysisResponse(parsed);
    } catch (error: any) {
      lastError = error;
      console.warn('❌ Doubao audio analysis failed:', error.message);
    }
  }

  // Try Gemini (priority 2)
  if ((AI_PROVIDER === 'gemini' || AI_PROVIDER === 'auto') && gemini) {
    try {
      console.log('🔄 Trying Gemini audio analysis...');
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      console.log('✅ Gemini audio analysis successful');
      return validateAnalysisResponse(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ Gemini skipped (API key issue)');
      } else {
        console.warn('❌ Gemini audio analysis failed:', error.message);
      }
    }
  }

  // Try OpenAI (priority 3 - fallback)
  if ((AI_PROVIDER === 'openai' || AI_PROVIDER === 'auto') && openai) {
    try {
      console.log('🔄 Trying OpenAI audio analysis...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a scenario generator. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI');
      console.log('✅ OpenAI audio analysis successful');
      return validateAnalysisResponse(JSON.parse(text));
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ OpenAI skipped (API key issue)');
      } else {
        console.warn('❌ OpenAI audio analysis failed:', error.message);
      }
    }
  }

  // Fallback scenario
  console.warn('⚠️ All AI providers failed, using fallback scenario');
  return {
    location: transcribedText || 'Practice Location',
    situation: transcribedText 
      ? `Practice conversation based on: ${transcribedText}`
      : 'Practice conversation',
    difficulty: level === 'Beginner' ? 'A1' : level === 'Intermediate' ? 'B1' : 'C1',
    role_name: 'Practice Partner',
    context: 'Be helpful and encouraging. Guide the conversation naturally.',
    first_line: transcribedText 
      ? `I understand you'd like to practice: ${transcribedText}. Let's start!`
      : 'Hello! How can I help you practice today?',
    user_hints: ['Start conversation', 'Ask a question', 'Tell me more'],
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
  ensureProviderAvailable();
  const systemPrompt = `
You are an English conversation tutor conducting a roleplay dialogue exercise.

📍 SCENARIO CONTEXT & GOAL:
${scenarioContext}

🎯 YOUR ROLE & BEHAVIOR:
CRITICAL: Check the context above to understand your role correctly:
- If context says "wait for student's question" or "respond to inquiries": Student leads, YOU respond helpfully
- If context says "greet" or "help customer": YOU can initiate and guide
- Match the interaction style to the scenario (service-oriented vs. conversational)
- Your responses should naturally advance towards goal completion

Key principles:
- If goals start with "Ask about/Find out": Student asks, YOU answer
- If goals start with "Order/Request/Buy": YOU guide the transaction
- Always stay in character and keep responses natural and appropriate

👤 STUDENT LEVEL: ${level}
- Adapt language complexity to match their level
- Be encouraging and supportive
- Provide detailed, constructive feedback

💬 COMPREHENSIVE FEEDBACK:
Evaluate each student response on:
1. **Grammar** - Identify errors and explain corrections
2. **Natural Expression** - Show how a native speaker would say it
3. **Scenario Progress** - How well they're moving towards the goal (0-100 score)

Scoring guide:
- 0-30: Off-topic or grammatically poor, not progressing
- 31-60: On-topic but needs improvement, slight progress
- 61-85: Good response, clear progress towards goal
- 86-100: Excellent, significant progress or goal achieved

⚠️ IMPORTANT:
- Keep the main storyline clear and guide towards the goal
- Next hints should push the conversation towards goal completion
- End when the scenario goal is naturally achieved
- Provide actionable, specific suggestions

Return JSON:
{
  "feedback": {
    "score": 0-100,
    "comment": "Overall assessment of their response",
    "grammar": "Grammar analysis - point out errors and explain corrections (empty string if perfect)",
    "native_expression": "How a native speaker would naturally express the same idea"
  },
  "next_response": "Your character's natural reply that advances the scenario",
  "next_hints": ["Suggestion that moves towards goal", "Alternative that progresses conversation", "Option that addresses next step"],
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

  // Try Doubao (priority 1)
  if ((AI_PROVIDER === 'doubao' || AI_PROVIDER === 'auto') && doubao) {
    try {
      console.log('🔥 Trying Doubao dialogue...');
      const response = await doubao.chat(messages, {
        maxTokens: 3000, // Prevent response truncation
        temperature: 0.7,
      });
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

  // Try Gemini (priority 2)
  if ((AI_PROVIDER === 'gemini' || AI_PROVIDER === 'auto') && gemini) {
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
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ Gemini skipped (API key issue)');
      } else {
        console.warn('❌ Gemini dialogue failed:', error.message);
        if (error.stack) {
          console.warn('Stack trace:', error.stack);
        }
      }
    }
  }

  // Try OpenAI (priority 3 - fallback)
  if ((AI_PROVIDER === 'openai' || AI_PROVIDER === 'auto') && openai) {
    try {
      console.log('🔄 Trying OpenAI dialogue...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI');
      console.log('✅ OpenAI dialogue successful');
      return validateDialogueResponse(JSON.parse(text));
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        console.log('ℹ️ OpenAI skipped (API key issue)');
      } else {
        console.warn('❌ OpenAI dialogue failed:', error.message);
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
      ], {
        maxTokens: 2000, // Flashcards need moderate token limit
        temperature: 0.7,
      });
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
    goals: Array.isArray(data?.goals) ? data.goals : undefined,
    completion_phrase: data?.completion_phrase || undefined,
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
      grammar: data?.feedback?.grammar || '',
      native_expression: data?.feedback?.native_expression || '',
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
    // Try Doubao (priority 1)
    if (doubao) {
      const response = await doubao.chat([{ role: 'user', content: prompt }], {
        maxTokens: 1000, // Translation should be concise
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content || 'Translation failed';
    }
    // Try Gemini (priority 2)
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    // Try OpenAI (priority 3 - fallback)
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || 'Translation failed';
    }
  } catch (error) {
    console.error('Translation error:', error);
  }

  return 'Translation unavailable';
}

export async function optimizeText(text: string): Promise<string> {
  const prompt = `Make this English more natural and native: "${text}"`;

  try {
    // Try Doubao (priority 1)
    if (doubao) {
      const response = await doubao.chat([{ role: 'user', content: prompt }], {
        maxTokens: 1000, // Optimization should be concise
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content || text;
    }
    // Try Gemini (priority 2)
    if (gemini) {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
    // Try OpenAI (priority 3 - fallback)
    if (openai) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || text;
    }
  } catch (error) {
    console.error('Optimization error:', error);
  }

  return text;
}
