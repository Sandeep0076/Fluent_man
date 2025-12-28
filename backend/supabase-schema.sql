-- DeutschTagebuch Database Schema for Supabase
-- Run this script in Supabase SQL Editor to create all tables

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Journal Entries Table
CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGSERIAL PRIMARY KEY,
  english_text TEXT NOT NULL,
  german_text TEXT NOT NULL,
  english_bullets JSONB DEFAULT '[]'::jsonb,
  german_bullets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  word_count INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0
);

-- Vocabulary Table
CREATE TABLE IF NOT EXISTS vocabulary (
  id BIGSERIAL PRIMARY KEY,
  word TEXT UNIQUE NOT NULL,
  meaning TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  frequency INTEGER DEFAULT 1,
  last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Phrases Table
CREATE TABLE IF NOT EXISTS custom_phrases (
  id BIGSERIAL PRIMARY KEY,
  english TEXT NOT NULL,
  german TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  times_reviewed INTEGER DEFAULT 0
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id BIGSERIAL PRIMARY KEY,
  daily_goal_minutes INTEGER DEFAULT 60,
  daily_sentence_goal INTEGER DEFAULT 10,
  theme TEXT DEFAULT 'light'
);

-- Progress Stats Table
CREATE TABLE IF NOT EXISTS progress_stats (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  words_learned INTEGER DEFAULT 0,
  entries_written INTEGER DEFAULT 0,
  minutes_practiced INTEGER DEFAULT 0
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_first_seen ON vocabulary(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_progress_date ON progress_stats(date DESC);

-- Insert Default Settings
INSERT INTO user_settings (daily_goal_minutes, daily_sentence_goal, theme)
VALUES (60, 10, 'light')
ON CONFLICT DO NOTHING;

-- Disable Row Level Security for now (enable later if needed)
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_phrases DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress_stats DISABLE ROW LEVEL SECURITY;

-- Optional: Enable RLS and create policies (commented out for now)
-- Uncomment these if you want to add user authentication later

-- ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for authenticated users" ON journal_entries
--   FOR ALL USING (auth.role() = 'authenticated');

-- ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for authenticated users" ON vocabulary
--   FOR ALL USING (auth.role() = 'authenticated');

-- ALTER TABLE custom_phrases ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for authenticated users" ON custom_phrases
--   FOR ALL USING (auth.role() = 'authenticated');

-- ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for authenticated users" ON user_settings
--   FOR ALL USING (auth.role() = 'authenticated');

-- ALTER TABLE progress_stats ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for authenticated users" ON progress_stats
--   FOR ALL USING (auth.role() = 'authenticated');
