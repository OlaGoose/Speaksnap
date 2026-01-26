-- SpeakSnap v3 Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Scenarios Table (with integrated dialogue stats)
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  location TEXT NOT NULL,
  situation TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  role_name TEXT NOT NULL,
  context TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  last_practiced BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dialogue Records Table (belongs to scenarios)
CREATE TABLE IF NOT EXISTS dialogue_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  timestamp BIGINT NOT NULL,
  user_level TEXT CHECK (user_level IN ('Beginner', 'Intermediate', 'Advanced')) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  average_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards Table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back JSONB NOT NULL,
  image_url TEXT,
  context TEXT NOT NULL,
  source TEXT CHECK (source IN ('dialogue', 'diary')),
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diary Entries Table
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  semantic_summary TEXT NOT NULL,
  rewrites JSONB NOT NULL,
  extracted_patterns JSONB NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sentence Patterns Table
CREATE TABLE IF NOT EXISTS sentence_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  explanation TEXT NOT NULL,
  example TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_level TEXT CHECK (user_level IN ('Beginner', 'Intermediate', 'Advanced')) DEFAULT 'Beginner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS scenarios_user_id_idx ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS scenarios_timestamp_idx ON scenarios(timestamp DESC);
CREATE INDEX IF NOT EXISTS scenarios_last_practiced_idx ON scenarios(last_practiced DESC);
CREATE INDEX IF NOT EXISTS dialogue_records_scenario_id_idx ON dialogue_records(scenario_id);
CREATE INDEX IF NOT EXISTS dialogue_records_user_id_idx ON dialogue_records(user_id);
CREATE INDEX IF NOT EXISTS dialogue_records_timestamp_idx ON dialogue_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS flashcards_user_id_idx ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS flashcards_timestamp_idx ON flashcards(timestamp DESC);
CREATE INDEX IF NOT EXISTS diary_entries_user_id_idx ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS diary_entries_timestamp_idx ON diary_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS sentence_patterns_user_id_idx ON sentence_patterns(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Scenarios policies
CREATE POLICY "Users can view their own scenarios"
  ON scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
  ON scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- Dialogue records policies
CREATE POLICY "Users can view their own dialogue records"
  ON dialogue_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dialogue records"
  ON dialogue_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dialogue records"
  ON dialogue_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dialogue records"
  ON dialogue_records FOR DELETE
  USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can view their own flashcards"
  ON flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
  ON flashcards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
  ON flashcards FOR DELETE
  USING (auth.uid() = user_id);

-- Diary entries policies
CREATE POLICY "Users can view their own diary entries"
  ON diary_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary entries"
  ON diary_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries"
  ON diary_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diary entries"
  ON diary_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Sentence patterns policies
CREATE POLICY "Users can view their own sentence patterns"
  ON sentence_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sentence patterns"
  ON sentence_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sentence patterns"
  ON sentence_patterns FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Storage bucket for scenario images
INSERT INTO storage.buckets (id, name, public)
VALUES ('scenarios', 'scenarios', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own scenario images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scenarios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view scenario images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scenarios');

CREATE POLICY "Users can delete their own scenario images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'scenarios' AND auth.uid()::text = (storage.foldername(name))[1]);
