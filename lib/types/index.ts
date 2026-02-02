/**
 * Core Types for SpeakSnap v3
 */

export type UserLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type PracticeMode = 'Daily' | 'IELTS';

export enum Screen {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  ANALYSIS = 'ANALYSIS',
  DIALOGUE = 'DIALOGUE',
  LIBRARY = 'LIBRARY',
}

export interface DialogueLine {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  feedback?: {
    score: number;
    comment: string;
    grammar?: string;
    native_expression?: string;
    correction?: string;
    better_alternative?: string;
  };
}

export interface DialogueRecord {
  id: string;
  messages: DialogueLine[];
  timestamp: number;
  user_level: UserLevel;
  is_completed: boolean;
  average_score?: number;
}

export interface Scenario {
  id: string;
  user_id?: string;
  image_url?: string;
  location: string;
  situation: string;
  difficulty: string;
  role_name: string;
  context: string;
  goals?: string[]; // AI-generated conversation goals
  completion_phrase?: string; // Phrase to indicate conversation completion
  timestamp: number;
  created_at?: string;
  
  // Integrated dialogue records
  dialogues: DialogueRecord[];
  total_attempts: number;
  best_score: number;
  last_practiced: number;
}

export interface Flashcard {
  id: string;
  user_id?: string;
  front: string;
  back: {
    phonetic?: string;
    translation: string;
    definition?: string;
    example?: string;
    native_usage?: string;
    video_ids?: string[];
  };
  image_url?: string;
  context: string;
  timestamp: number;
  source?: 'dialogue' | 'diary';
  created_at?: string;
}

export interface SentencePattern {
  id: string;
  pattern: string;
  explanation: string;
  example: string;
  tags: string[];
  timestamp: number;
}

export interface DiaryEntry {
  id: string;
  user_id?: string;
  original?: string;
  optimized?: string;
  upgraded?: string;
  analysis_data?: {
    overallScore?: number;
    overallLevel?: string;
    summary?: string;
    stats?: any;
    strengths?: string[];
    improvements?: string[];
    grammarFocus?: string[];
    sentenceAnalysis?: any[];
    patterns?: any[];
  };
  timestamp: number;
  created_at?: string;
}

// AI Response Types
export interface AnalyzeImageResponse {
  location: string;
  situation: string;
  difficulty: string;
  role_name: string;
  context: string;
  goals?: string[]; // AI-generated conversation goals
  completion_phrase?: string; // Phrase to indicate conversation completion
  first_line: string;
  user_hints: string[];
}

export interface DialogueResponse {
  feedback: {
    score: number;
    comment: string;
    grammar?: string;
    native_expression?: string;
    correction?: string;
    better_alternative?: string;
  };
  next_response: string;
  next_hints: string[];
  is_finished: boolean;
}

export interface FlashcardGeneration {
  term: string;
  phonetic?: string;
  translation: string;
  definition: string;
  example: string;
  native_usage?: string;
  video_ids?: string[];
}

export interface DiaryProcessResult {
  semantic_summary: string;
  rewrites: string[];
  extracted_patterns: Omit<SentencePattern, 'id' | 'timestamp'>[];
  flashcards: FlashcardGeneration[];
}

// Shadow Reading (影子跟读) types
export interface ShadowDailyChallenge {
  topic: string;
  text: string;
  sourceUrl?: string;
}

export interface ShadowWordAnalysis {
  word: string;
  status: 'good' | 'average' | 'poor';
  phonetic?: string;
  issue?: string;
  refStartTime?: number; // Reference audio start time in seconds
  refEndTime?: number; // Reference audio end time in seconds
  userStartTime?: number; // User audio start time in seconds
  userEndTime?: number; // User audio end time in seconds
}

export interface ShadowAnalysisResult {
  score: number;
  fluency: string;
  words: ShadowWordAnalysis[];
  pronunciation: {
    strengths: string[];
    weaknesses: string[];
  };
  intonation: string;
  suggestions: string;
}

/** Stored entry for shadow analysis review (no audio URLs). */
export interface ShadowHistoryEntry {
  id: string;
  timestamp: number;
  challenge: { topic: string; text: string; sourceUrl?: string };
  analysis: ShadowAnalysisResult;
}
