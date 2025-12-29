import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * GET /api/data/export
 */
router.get('/export', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: true });

    if (journalError) throw journalError;

    const { data: vocabulary, error: vocabError } = await supabase
      .from('vocabulary')
      .select('*')
      .order('first_seen', { ascending: true });

    if (vocabError) throw vocabError;

    const { data: customPhrases, error: phrasesError } = await supabase
      .from('custom_phrases')
      .select('*')
      .order('created_at', { ascending: true });

    if (phrasesError) throw phrasesError;

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    const settingsData = settingsError ? {} : settings;

    const { data: progressStats, error: statsError } = await supabase
      .from('progress_stats')
      .select('*')
      .order('date', { ascending: true });

    if (statsError) throw statsError;

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        journalEntries: journalEntries || [],
        vocabulary: vocabulary || [],
        customPhrases: customPhrases || [],
        settings: settingsData,
        progressStats: progressStats || []
      },
      metadata: {
        totalEntries: journalEntries?.length || 0,
        totalVocabulary: vocabulary?.length || 0,
        totalCustomPhrases: customPhrases?.length || 0,
        totalProgressDays: progressStats?.length || 0
      }
    };

    c.header('Content-Type', 'application/json');
    c.header('Content-Disposition', `attachment; filename=deutschtagebuch-backup-${new Date().toISOString().split('T')[0]}.json`);

    return c.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    return c.json({ success: false, error: 'Failed to export data' }, 500);
  }
});

/**
 * POST /api/data/import
 */
router.post('/import', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data, mode } = await c.req.json();

    if (!data || typeof data !== 'object' || !data.data || typeof data.data !== 'object') {
      return c.json({ success: false, error: 'Invalid import data format' }, 400);
    }

    const importMode = mode || 'merge';
    const stats = { journalEntries: 0, vocabulary: 0, customPhrases: 0, progressStats: 0, errors: [] };

    if (importMode === 'replace') {
      await supabase.from('journal_entries').delete().neq('id', 0);
      await supabase.from('vocabulary').delete().neq('id', 0);
      await supabase.from('custom_phrases').delete().neq('id', 0);
      await supabase.from('progress_stats').delete().neq('id', 0);
    }

    if (data.data.journalEntries && Array.isArray(data.data.journalEntries)) {
      for (const entry of data.data.journalEntries) {
        try {
          const { error } = await supabase.from('journal_entries').insert({
            english_text: entry.english_text,
            german_text: entry.german_text,
            created_at: entry.created_at,
            word_count: entry.word_count || 0,
            session_duration: entry.session_duration || 0
          });
          if (!error) stats.journalEntries++;
        } catch (err) { stats.errors.push(`Journal entry error: ${err.message}`); }
      }
    }

    if (data.data.vocabulary && Array.isArray(data.data.vocabulary)) {
      for (const word of data.data.vocabulary) {
        try {
          const { error } = await supabase.from('vocabulary').insert({
            word: word.word,
            meaning: word.meaning,
            first_seen: word.first_seen,
            frequency: word.frequency || 1,
            last_reviewed: word.last_reviewed
          });
          if (!error) stats.vocabulary++;
        } catch (err) { stats.errors.push(`Vocabulary error: ${err.message}`); }
      }
    }

    if (data.data.customPhrases && Array.isArray(data.data.customPhrases)) {
      for (const phrase of data.data.customPhrases) {
        try {
          const { error } = await supabase.from('custom_phrases').insert({
            english: phrase.english,
            german: phrase.german,
            created_at: phrase.created_at,
            times_reviewed: phrase.times_reviewed || 0
          });
          if (!error) stats.customPhrases++;
        } catch (err) { stats.errors.push(`Phrase error: ${err.message}`); }
      }
    }

    if (data.data.progressStats && Array.isArray(data.data.progressStats)) {
      for (const stat of data.data.progressStats) {
        try {
          const { error } = await supabase.from('progress_stats').upsert({
            date: stat.date,
            words_learned: stat.words_learned || 0,
            entries_written: stat.entries_written || 0,
            minutes_practiced: stat.minutes_practiced || 0
          }, { onConflict: 'date' });
          if (!error) stats.progressStats++;
        } catch (err) { stats.errors.push(`Progress stats error: ${err.message}`); }
      }
    }

    if (data.data.settings && typeof data.data.settings === 'object') {
      const { data: existing } = await supabase.from('user_settings').select('*').limit(1).single();
      if (existing) {
        await supabase.from('user_settings').update({
          daily_goal_minutes: data.data.settings.daily_goal_minutes || 60,
          daily_sentence_goal: data.data.settings.daily_sentence_goal || 10,
          theme: data.data.settings.theme || 'light'
        }).eq('id', existing.id);
      }
    }

    return c.json({
      success: true,
      message: 'Data imported successfully',
      stats: {
        imported: {
          journalEntries: stats.journalEntries,
          vocabulary: stats.vocabulary,
          customPhrases: stats.customPhrases,
          progressStats: stats.progressStats
        },
        errors: stats.errors.length > 0 ? stats.errors : undefined
      }
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return c.json({ success: false, error: 'Failed to import data', details: error.message }, 500);
  }
});

/**
 * DELETE /api/data/clear
 */
router.delete('/clear', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { confirm } = await c.req.json();
    if (confirm !== 'DELETE_ALL_DATA') {
      return c.json({ success: false, error: 'Confirmation required. Send { "confirm": "DELETE_ALL_DATA" }' }, 400);
    }

    await supabase.from('journal_entries').delete().neq('id', 0);
    await supabase.from('vocabulary').delete().neq('id', 0);
    await supabase.from('custom_phrases').delete().neq('id', 0);
    await supabase.from('progress_stats').delete().neq('id', 0);

    return c.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Error clearing data:', error);
    return c.json({ success: false, error: 'Failed to clear data' }, 500);
  }
});

export default router