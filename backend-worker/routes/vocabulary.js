import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'
import { getVocabularyStats } from '../services/vocabulary-extractor.js'
import { translateToGerman } from '../services/translation.js'

const router = new Hono()

/**
 * GET /api/vocabulary
 * Get all vocabulary words with optional filtering and sorting
 */
router.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const sort = c.req.query('sort')
    const search = c.req.query('search')
    const category_id = c.req.query('category_id')

    let query = supabase.from('vocabulary').select('*');

    // Add category filter
    if (category_id && category_id !== 'all') {
      query = query.eq('category_id', category_id);
    }

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

    return c.json({
      success: true,
      data: words || [],
      count: words ? words.length : 0
    });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch vocabulary'
    }, 500);
  }
});

/**
 * GET /api/vocabulary/categories
 * Get all vocabulary categories
 */
router.get('/categories', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: categories, error } = await supabase
      .from('vocabulary_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return c.json({
      success: true,
      data: categories || []
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch categories'
    }, 500);
  }
});

/**
 * POST /api/vocabulary/categories
 * Add a new vocabulary category
 */
router.post('/categories', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { name } = await c.req.json();
    if (!name || name.trim().length === 0) {
      return c.json({ success: false, error: 'Category name is required' }, 400);
    }

    const { data: category, error } = await supabase
      .from('vocabulary_categories')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint
        return c.json({ success: false, error: 'Category already exists' }, 409);
      }
      throw error;
    }

    return c.json({
      success: true,
      data: category
    }, 201);
  } catch (error) {
    console.error('Error adding category:', error);
    return c.json({
      success: false,
      error: 'Failed to add category'
    }, 500);
  }
});

/**
 * DELETE /api/vocabulary/categories/:id
 * Delete a vocabulary category
 */
router.delete('/categories/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { error } = await supabase
      .from('vocabulary_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({
      success: false,
      error: 'Failed to delete category'
    }, 500);
  }
});

/**
 * GET /api/vocabulary/stats
 * Get vocabulary statistics
 */
router.get('/stats', async (c) => {
  try {
    const stats = await getVocabularyStats(c.env);

    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching vocabulary stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch vocabulary statistics'
    }, 500);
  }
});

/**
 * POST /api/vocabulary
 * Manually add a vocabulary word
 */
router.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { word, meaning, category_id } = await c.req.json();

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Valid word is required'
      }, 400);
    }

    const englishWord = word.trim();
    let germanTranslation = meaning?.trim() || null;

    if (!germanTranslation) {
      try {
        germanTranslation = await translateToGerman(englishWord);
      } catch (error) {
        console.error('Error translating to German:', error);
      }
    }

    if (germanTranslation) {
      const { data: existing } = await supabase
        .from('vocabulary')
        .select('*')
        .ilike('word', germanTranslation)
        .single();

      if (existing) {
        return c.json({
          success: false,
          error: 'Word already exists in vocabulary',
          data: existing
        }, 409);
      }
    }

    const { data: newWord, error } = await supabase
      .from('vocabulary')
      .insert({
        word: germanTranslation || englishWord,
        meaning: englishWord,
        frequency: 1,
        category_id: category_id || null
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      data: {
        ...newWord,
        translated: !meaning
      }
    }, 201);
  } catch (error) {
    console.error('Error adding vocabulary word:', error);
    return c.json({
      success: false,
      error: 'Failed to add vocabulary word'
    }, 500);
  }
});

/**
 * DELETE /api/vocabulary/:id
 * Delete a vocabulary word
 */
router.delete('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { error } = await supabase
      .from('vocabulary')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Vocabulary word deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vocabulary word:', error);
    return c.json({
      success: false,
      error: 'Failed to delete vocabulary word'
    }, 500);
  }
});

/**
 * GET /api/vocabulary/:id/meaning
 * Get or fetch meaning for a specific word
 */
router.get('/:id/meaning', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { data: word, error } = await supabase
      .from('vocabulary')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Vocabulary word not found'
        }, 404);
      }
      throw error;
    }

    if (word.meaning) {
      return c.json({
        success: true,
        data: {
          word: word.word,
          meaning: word.meaning
        }
      });
    }

    try {
      const meaning = await translateToGerman(word.word);

      await supabase
        .from('vocabulary')
        .update({ meaning })
        .eq('id', id);

      return c.json({
        success: true,
        data: {
          word: word.word,
          meaning: meaning
        }
      });
    } catch (error) {
      console.error('Error fetching meaning:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch word meaning'
      }, 500);
    }
  } catch (error) {
    console.error('Error getting word meaning:', error);
    return c.json({
      success: false,
      error: 'Failed to get word meaning'
    }, 500);
  }
});

/**
 * PUT /api/vocabulary/:id/review
 * Mark a word as reviewed
 */
router.put('/:id/review', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { error } = await supabase
      .from('vocabulary')
      .update({ last_reviewed: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Word marked as reviewed'
    });
  } catch (error) {
    console.error('Error updating vocabulary word:', error);
    return c.json({
      success: false,
      error: 'Failed to update vocabulary word'
    }, 500);
  }
});

export default router