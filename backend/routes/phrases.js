const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

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
router.get('/', async (req, res) => {
  try {
    // Get custom phrases from database
    const { data: customPhrases, error } = await supabase
      .from('custom_phrases')
      .select('id, english, german, created_at, times_reviewed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add builtin flag to custom phrases
    const customWithFlag = (customPhrases || []).map(p => ({ ...p, builtin: false }));

    // Combine built-in and custom phrases
    const allPhrases = [...BUILT_IN_PHRASES, ...customWithFlag];

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phrases'
    });
  }
});

/**
 * POST /api/phrases
 * Add a custom phrase
 */
router.post('/', async (req, res) => {
  try {
    const { english, german } = req.body;

    // Validation
    if (!english || !german) {
      return res.status(400).json({
        success: false,
        error: 'Both English and German text are required'
      });
    }

    if (typeof english !== 'string' || typeof german !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'English and German text must be strings'
      });
    }

    const cleanEnglish = english.trim();
    const cleanGerman = german.trim();

    if (cleanEnglish.length === 0 || cleanGerman.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'English and German text cannot be empty'
      });
    }

    // Check if phrase already exists
    const { data: existing } = await supabase
      .from('custom_phrases')
      .select('*')
      .or(`english.ilike.${cleanEnglish},german.ilike.${cleanGerman}`)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This phrase already exists',
        data: existing
      });
    }

    // Insert new phrase
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

    res.status(201).json({
      success: true,
      data: {
        ...newPhrase,
        builtin: false
      }
    });
  } catch (error) {
    console.error('Error adding custom phrase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add custom phrase'
    });
  }
});

/**
 * DELETE /api/phrases/:id
 * Delete a custom phrase
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('custom_phrases')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Custom phrase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom phrase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom phrase'
    });
  }
});

/**
 * PUT /api/phrases/:id/review
 * Increment review count for a phrase
 */
router.put('/:id/review', async (req, res) => {
  try {
    // Get current times_reviewed value
    const { data: phrase, error: fetchError } = await supabase
      .from('custom_phrases')
      .select('times_reviewed')
      .eq('id', req.params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Custom phrase not found'
        });
      }
      throw fetchError;
    }

    // Increment times_reviewed
    const { error } = await supabase
      .from('custom_phrases')
      .update({ times_reviewed: (phrase.times_reviewed || 0) + 1 })
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Phrase review count updated'
    });
  } catch (error) {
    console.error('Error updating phrase review count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phrase'
    });
  }
});

module.exports = router;