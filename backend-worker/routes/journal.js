import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

// Helper to split text into bullets
function splitIntoBullets(text) {
  if (!text) return [];
  return text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * GET /api/journal/entries
 * Get all journal entries with pagination
 */
router.get('/entries', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const sort = c.req.query('sort') || 'newest';
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

    return c.json({
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
    return c.json({
      success: false,
      error: 'Failed to fetch journal entries'
    }, 500);
  }
});

/**
 * GET /api/journal/entry/:id
 * Get a specific journal entry
 */
router.get('/entry/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Journal entry not found'
        }, 404);
      }
      throw error;
    }

    return c.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch journal entry'
    }, 500);
  }
});

/**
 * POST /api/journal/entry
 * Create a new journal entry
 */
router.post('/entry', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { english_text, german_text, session_duration } = await c.req.json();

    // Validation
    if (!english_text || !german_text) {
      return c.json({
        success: false,
        error: 'Both English and German text are required'
      }, 400);
    }

    // Split text into bullets
    const englishBullets = splitIntoBullets(english_text);
    const germanBullets = splitIntoBullets(german_text);

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
      return c.json({
        success: false,
        error: `Database error: ${insertError.message}`,
        details: insertError
      }, 500);
    }

    const newWords = [];

    // Update progress stats for today
    const today = new Date().toISOString().split('T')[0];

    const { data: existingStats, error: statsFetchError } = await supabase
      .from('progress_stats')
      .select('*')
      .eq('date', today)
      .maybeSingle();

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

    return c.json({
      success: true,
      data: {
        ...newEntry,
        new_words: newWords
      }
    }, 201);
  } catch (error) {
    console.error('Unhandled Error in POST /journal/entry:', error);
    return c.json({
      success: false,
      error: 'An unexpected error occurred while saving your entry.',
      message: error.message
    }, 500);
  }
});

/**
 * PUT /api/journal/entry/:id
 * Update a journal entry
 */
router.put('/entry/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { english_text, german_text } = await c.req.json();

    const { data: existing, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Journal entry not found'
        }, 404);
      }
      throw fetchError;
    }

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

    const { data: updated, error } = await supabase
      .from('journal_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      data: {
        ...updated,
        new_words: []
      }
    });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    return c.json({
      success: false,
      error: 'Failed to update journal entry'
    }, 500);
  }
});

/**
 * DELETE /api/journal/entry/:id
 * Delete a journal entry
 */
router.delete('/entry/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return c.json({
      success: false,
      error: 'Failed to delete journal entry'
    }, 500);
  }
});

/**
 * GET /api/journal/search
 * Search journal entries
 */
router.get('/search', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const q = c.req.query('q')
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')

    if (!q && !startDate && !endDate) {
      return c.json({
        success: false,
        error: 'Search query or date range required'
      }, 400);
    }

    let query = supabase.from('journal_entries').select('*');

    if (q) {
      query = query.or(`english_text.ilike.%${q}%,german_text.ilike.%${q}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      query = query.lt('created_at', endDateTime.toISOString());
    }

    const { data: results, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return c.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (error) {
    console.error('Error searching journal entries:', error);
    return c.json({
      success: false,
      error: 'Failed to search journal entries'
    }, 500);
  }
});

export default router