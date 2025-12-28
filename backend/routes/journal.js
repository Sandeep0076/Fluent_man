const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
// const { extractVocabulary } = require('../services/vocabulary-extractor'); (disabled as per user request)

// Helper to split text into bullets
function splitIntoBullets(text) {
  if (!text) return [];
  return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * GET /api/journal/entries
 * Get all journal entries with pagination
 */
router.get('/entries', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const sort = req.query.sort || 'newest';
    let orderColumn = 'created_at';
    let ascending = false;

    switch (sort) {
      case 'oldest':
        orderColumn = 'created_at';
        ascending = true;
        break;
      case 'longest':
        orderColumn = 'word_count';
        ascending = false;
        break;
      case 'shortest':
        orderColumn = 'word_count';
        ascending = true;
        break;
      default:
        orderColumn = 'created_at';
        ascending = false;
    }

    // Get entries with pagination
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order(orderColumn, { ascending })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get total count
    const { count, error: countError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    res.json({
      success: true,
      data: entries || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entries'
    });
  }
});

/**
 * GET /api/journal/entry/:id
 * Get a specific journal entry
 */
router.get('/entry/:id', async (req, res) => {
  try {
    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Journal entry not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entry'
    });
  }
});

/**
 * POST /api/journal/entry
 * Create a new journal entry
 */
router.post('/entry', async (req, res) => {
  try {
    const { english_text, german_text, session_duration } = req.body;

    // Validation
    if (!english_text || !german_text) {
      return res.status(400).json({
        success: false,
        error: 'Both English and German text are required'
      });
    }

    // Split text into bullets (by newlines)
    const englishBullets = english_text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const germanBullets = german_text.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    // Count words in German text
    const wordCount = german_text.trim().split(/\s+/).length;

    // Insert journal entry
    const { data: newEntry, error: insertError } = await supabase
      .from('journal_entries')
      .insert({
        english_text,
        german_text,
        english_bullets: englishBullets,
        german_bullets: germanBullets,
        word_count: wordCount,
        session_duration: session_duration || 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      return res.status(500).json({
        success: false,
        error: `Database error: ${insertError.message}`,
        details: insertError
      });
    }

    // Extract vocabulary from German text (disabled as per user request)
    // const newWords = await extractVocabulary(german_text);
    const newWords = [];

    // Update progress stats for today
    const today = new Date().toISOString().split('T')[0];

    // Check if stats exist for today (ilike for dates doesn't work well, using standard eq)
    const { data: existingStats, error: statsFetchError } = await supabase
      .from('progress_stats')
      .select('*')
      .eq('date', today)
      .maybeSingle(); // maybeSingle doesn't throw if not found

    if (statsFetchError) {
      console.warn('Error fetching progress stats:', statsFetchError.message);
    }

    if (existingStats) {
      const { error: updateError } = await supabase
        .from('progress_stats')
        .update({
          words_learned: (existingStats.words_learned || 0) + newWords.length,
          entries_written: (existingStats.entries_written || 0) + 1,
          minutes_practiced: (existingStats.minutes_practiced || 0) + (session_duration || 0)
        })
        .eq('date', today);

      if (updateError) console.error('Error updating stats:', updateError.message);
    } else {
      const { error: statsInsertError } = await supabase
        .from('progress_stats')
        .insert({
          date: today,
          words_learned: newWords.length,
          entries_written: 1,
          minutes_practiced: session_duration || 0
        });

      if (statsInsertError) console.error('Error inserting stats:', statsInsertError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        ...newEntry,
        new_words: newWords
      }
    });
  } catch (error) {
    console.error('Unhandled Error in POST /journal/entry:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while saving your entry.',
      message: error.message
    });
  }
});

/**
 * PUT /api/journal/entry/:id
 * Update a journal entry
 */
router.put('/entry/:id', async (req, res) => {
  try {
    const { english_text, german_text } = req.body;

    // Check if entry exists
    const { data: existing, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Journal entry not found'
        });
      }
      throw fetchError;
    }

    // Prepare update data
    const updateData = {};

    if (english_text) {
      updateData.english_text = english_text;
      updateData.english_bullets = splitIntoBullets(english_text);
    }

    if (german_text) {
      updateData.german_text = german_text;
      updateData.german_bullets = splitIntoBullets(german_text);
      updateData.word_count = german_text.trim().split(/\s+/).length;
    }

    // Update entry
    const { data: updated, error } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // If German text changed, re-extract vocabulary (disabled as per user request)
    let newWords = [];
    /*
    if (german_text && german_text !== existing.german_text) {
      newWords = await extractVocabulary(german_text);
    }
    */

    res.json({
      success: true,
      data: {
        ...updated,
        new_words: newWords
      }
    });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update journal entry'
    });
  }
});

/**
 * DELETE /api/journal/entry/:id
 * Delete a journal entry
 */
router.delete('/entry/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete journal entry'
    });
  }
});

/**
 * GET /api/journal/search
 * Search journal entries
 */
router.get('/search', async (req, res) => {
  try {
    const { q, startDate, endDate } = req.query;

    if (!q && !startDate && !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Search query or date range required'
      });
    }

    let query = supabase.from('journal_entries').select('*');

    // Add search filter
    if (q) {
      query = query.or(`english_text.ilike.%${q}%,german_text.ilike.%${q}%`);
    }

    // Add date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      // Add one day to include the end date
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      query = query.lt('created_at', endDateTime.toISOString());
    }

    const { data: results, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (error) {
    console.error('Error searching journal entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search journal entries'
    });
  }
});

module.exports = router;