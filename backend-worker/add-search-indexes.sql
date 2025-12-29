-- Add text search indexes for better search performance
-- Run this in your Supabase SQL Editor

-- Enable the pg_trgm extension FIRST (for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for text search on journal entries
CREATE INDEX IF NOT EXISTS idx_journal_english_text_gin ON journal_entries USING gin(to_tsvector('english', english_text));
CREATE INDEX IF NOT EXISTS idx_journal_german_text_gin ON journal_entries USING gin(to_tsvector('german', german_text));

-- Add indexes for ILIKE searches (pattern matching) - requires pg_trgm extension
CREATE INDEX IF NOT EXISTS idx_journal_english_text_trgm ON journal_entries USING gin(english_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_journal_german_text_trgm ON journal_entries USING gin(german_text gin_trgm_ops);