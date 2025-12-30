-- Migration: Add phrase categories support
-- This adds category functionality to custom phrases, mirroring the vocabulary categories pattern

-- Create Phrase Categories Table
CREATE TABLE IF NOT EXISTS phrase_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id column to custom_phrases table
ALTER TABLE custom_phrases
ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES phrase_categories(id) ON DELETE SET NULL;

-- Create index for performance on category lookups
CREATE INDEX IF NOT EXISTS idx_custom_phrases_category_id ON custom_phrases(category_id);

-- Disable Row Level Security to match existing schema pattern
ALTER TABLE phrase_categories DISABLE ROW LEVEL SECURITY;