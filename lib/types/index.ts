/**
 * Core Types for SpeakSnap v3
 */

export type UserLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export enum Screen {
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
    correction?: string;
    comment: string;
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
  original_text: string;
  semantic_summary: string;
  rewrites: string[];
  extracted_patterns: SentencePattern[];
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
  first_line: string;
  user_hints: string[];
}

export interface DialogueResponse {
  feedback: {
    score: number;
    comment: string;
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
