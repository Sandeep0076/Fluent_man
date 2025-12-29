import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

// Built-in common phrases
const BUILT_IN_PHRASES = [
  { english: "I agree with you up to a point.", german: "Ich stimme dir bis zu einem gewissen Punkt zu.", builtin: true },
  { english: "That depends on...", german: "Das kommt darauf an...", builtin: true },
  { english: "In my opinion...", german: "Meiner Meinung nach...", builtin: true },
  { english: "I am not sure if...", german: "Ich bin mir nicht sicher, ob...", builtin: true },
  { english: "Can you please explain that?", german: "Kannst du das bitte erklären?", builtin: true },
  { english: "On the one hand... on the other hand...", german: "Einerseits... andererseits...", builtin: true },
  { english: "It makes no difference to me.", german: "Das ist mir egal.", builtin: true },
  { english: "I would like to suggest that...", german: "Ich möchte vorschlagen, dass...", builtin: true }
];

/**
 * GET /api/phrases
 * Get all phrases (built-in + custom)
 */
router.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: customPhrases, error } = await supabase
      .from('custom_phrases')
      .select('id, english, german, created_at, times_reviewed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const customWithFlag = (customPhrases || []).map(p => ({ ...p, builtin: false }));
    const allPhrases = [...BUILT_IN_PHRASES, ...customWithFlag];

    return c.json({
      success: true,
      data: allPhrases,
      count: {
        total: allPhrases.length,
        builtin: BUILT_IN_PHRASES.length,
        custom: customWithFlag.length
      }
    });
  } catch (error) {
    console.error('Error fetching phrases:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch phrases'
    }, 500);
  }
});

/**
 * POST /api/phrases
 * Add a custom phrase
 */
router.post('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { english, german } = await c.req.json();

    if (!english || !german) {
      return c.json({
        success: false,
        error: 'Both English and German text are required'
      }, 400);
    }

    const cleanEnglish = english.trim();
    const cleanGerman = german.trim();

    if (cleanEnglish.length === 0 || cleanGerman.length === 0) {
      return c.json({
        success: false,
        error: 'English and German text cannot be empty'
      }, 400);
    }

    const { data: existing } = await supabase
      .from('custom_phrases')
      .select('*')
      .or(`english.ilike.${cleanEnglish},german.ilike.${cleanGerman}`)
      .single();

    if (existing) {
      return c.json({
        success: false,
        error: 'This phrase already exists',
        data: existing
      }, 409);
    }

    const { data: newPhrase, error } = await supabase
      .from('custom_phrases')
      .insert({
        english: cleanEnglish,
        german: cleanGerman,
        times_reviewed: 0
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      data: {
        ...newPhrase,
        builtin: false
      }
    }, 201);
  } catch (error) {
    console.error('Error adding custom phrase:', error);
    return c.json({
      success: false,
      error: 'Failed to add custom phrase'
    }, 500);
  }
});

/**
 * DELETE /api/phrases/:id
 * Delete a custom phrase
 */
router.delete('/:id', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { error } = await supabase
      .from('custom_phrases')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Custom phrase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom phrase:', error);
    return c.json({
      success: false,
      error: 'Failed to delete custom phrase'
    }, 500);
  }
});

/**
 * PUT /api/phrases/:id/review
 * Increment review count for a phrase
 */
router.put('/:id/review', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const id = c.req.param('id')
    const { data: phrase, error: fetchError } = await supabase
      .from('custom_phrases')
      .select('times_reviewed')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json({
          success: false,
          error: 'Custom phrase not found'
        }, 404);
      }
      throw fetchError;
    }

    const { error } = await supabase
      .from('custom_phrases')
      .update({ times_reviewed: (phrase.times_reviewed || 0) + 1 })
      .eq('id', id);

    if (error) throw error;

    return c.json({
      success: true,
      message: 'Phrase review count updated'
    });
  } catch (error) {
    console.error('Error updating phrase review count:', error);
    return c.json({
      success: false,
      error: 'Failed to update phrase'
    }, 500);
  }
});

export default router