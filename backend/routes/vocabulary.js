const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { getVocabularyStats } = require('../services/vocabulary-extractor');
const { translateToGerman } = require('../services/translation');

/**
 * GET /api/vocabulary
 * Get all vocabulary words with optional filtering and sorting
 */
router.get('/', async (req, res) => {
  try {
    const { sort, search } = req.query;
    let query = supabase.from('vocabulary').select('*');

    // Add search filter
    if (search) {
      query = query.ilike('word', `%${search}%`);
    }

    // Add sorting
    switch (sort) {
      case 'az':
        query = query.order('word', { ascending: true });
        break;
      case 'za':
        query = query.order('word', { ascending: false });
        break;
      case 'frequency':
        query = query.order('frequency', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('first_seen', { ascending: false });
        break;
    }

    const { data: words, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: words || [],
      count: words ? words.length : 0
    });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vocabulary'
    });
  }
});

/**
 * GET /api/vocabulary/stats
 * Get vocabulary statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getVocabularyStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching vocabulary stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vocabulary statistics'
    });
  }
});

/**
 * POST /api/vocabulary
 * Manually add a vocabulary word
 * Expects: English word, optionally German translation
 * If German translation not provided, auto-translates English to German
 */
router.post('/', async (req, res) => {
  try {
    const { word, meaning } = req.body;

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid word is required'
      });
    }

    const englishWord = word.trim();
    let germanTranslation = meaning?.trim() || null;

    // If German translation not provided, auto-translate English to German
    if (!germanTranslation) {
      try {
        germanTranslation = await translateToGerman(englishWord);
      } catch (error) {
        console.error('Error translating to German:', error);
        // Continue without translation if it fails
      }
    }

    // Check if German word already exists in vocabulary
    if (germanTranslation) {
      const { data: existing } = await supabase
        .from('vocabulary')
        .select('*')
        .ilike('word', germanTranslation)
        .single();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Word already exists in vocabulary',
          data: existing
        });
      }
    }

    // Insert new word (German word with English meaning)
    const { data: newWord, error } = await supabase
      .from('vocabulary')
      .insert({
        word: germanTranslation || englishWord,
        meaning: englishWord,
        frequency: 1
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: {
        ...newWord,
        translated: !meaning // Indicates if auto-translation was used
      }
    });
  } catch (error) {
    console.error('Error adding vocabulary word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add vocabulary word'
    });
  }
});

/**
 * DELETE /api/vocabulary/:id
 * Delete a vocabulary word
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vocabulary')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Vocabulary word deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vocabulary word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vocabulary word'
    });
  }
});

/**
 * GET /api/vocabulary/:id/meaning
 * Get or fetch meaning for a specific word
 */
router.get('/:id/meaning', async (req, res) => {
  try {
    const { data: word, error } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Vocabulary word not found'
        });
      }
      throw error;
    }

    // If meaning already exists, return it
    if (word.meaning) {
      return res.json({
        success: true,
        data: {
          word: word.word,
          meaning: word.meaning
        }
      });
    }

    // Otherwise, fetch translation
    try {
      const meaning = await translateToGerman(word.word);

      // Update database with the fetched meaning
      await supabase
        .from('vocabulary')
        .update({ meaning })
        .eq('id', req.params.id);

      res.json({
        success: true,
        data: {
          word: word.word,
          meaning: meaning
        }
      });
    } catch (error) {
      console.error('Error fetching meaning:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch word meaning'
      });
    }
  } catch (error) {
    console.error('Error getting word meaning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get word meaning'
    });
  }
});

/**
 * PUT /api/vocabulary/:id/review
 * Mark a word as reviewed (updates last_reviewed timestamp)
 */
router.put('/:id/review', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vocabulary')
      .update({ last_reviewed: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Word marked as reviewed'
    });
  } catch (error) {
    console.error('Error updating vocabulary word:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update vocabulary word'
    });
  }
});

module.exports = router;