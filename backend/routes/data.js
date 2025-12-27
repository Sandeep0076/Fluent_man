const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

/**
 * GET /api/data/export
 * Export all user data as JSON
 */
router.get('/export', async (req, res) => {
  try {
    // Fetch all data from all tables
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

    // Ignore error if no settings exist
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

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=deutschtagebuch-backup-${new Date().toISOString().split('T')[0]}.json`);

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

/**
 * POST /api/data/import
 * Import data from JSON backup
 */
router.post('/import', async (req, res) => {
  try {
    const { data, mode } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid import data format'
      });
    }

    // Validate data structure
    if (!data.data || typeof data.data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data structure'
      });
    }

    const importMode = mode || 'merge'; // 'merge' or 'replace'
    const stats = {
      journalEntries: 0,
      vocabulary: 0,
      customPhrases: 0,
      progressStats: 0,
      errors: []
    };

    // If replace mode, clear existing data
    if (importMode === 'replace') {
      await supabase.from('journal_entries').delete().neq('id', 0);
      await supabase.from('vocabulary').delete().neq('id', 0);
      await supabase.from('custom_phrases').delete().neq('id', 0);
      await supabase.from('progress_stats').delete().neq('id', 0);
    }

    // Import journal entries
    if (data.data.journalEntries && Array.isArray(data.data.journalEntries)) {
      for (const entry of data.data.journalEntries) {
        try {
          const { error } = await supabase
            .from('journal_entries')
            .insert({
              english_text: entry.english_text,
              german_text: entry.german_text,
              created_at: entry.created_at,
              word_count: entry.word_count || 0,
              session_duration: entry.session_duration || 0
            });

          if (!error) stats.journalEntries++;
        } catch (err) {
          stats.errors.push(`Journal entry error: ${err.message}`);
        }
      }
    }

    // Import vocabulary
    if (data.data.vocabulary && Array.isArray(data.data.vocabulary)) {
      for (const word of data.data.vocabulary) {
        try {
          const { error } = await supabase
            .from('vocabulary')
            .insert({
              word: word.word,
              meaning: word.meaning,
              first_seen: word.first_seen,
              frequency: word.frequency || 1,
              last_reviewed: word.last_reviewed
            });

          if (!error) stats.vocabulary++;
        } catch (err) {
          stats.errors.push(`Vocabulary error: ${err.message}`);
        }
      }
    }

    // Import custom phrases
    if (data.data.customPhrases && Array.isArray(data.data.customPhrases)) {
      for (const phrase of data.data.customPhrases) {
        try {
          const { error } = await supabase
            .from('custom_phrases')
            .insert({
              english: phrase.english,
              german: phrase.german,
              created_at: phrase.created_at,
              times_reviewed: phrase.times_reviewed || 0
            });

          if (!error) stats.customPhrases++;
        } catch (err) {
          stats.errors.push(`Phrase error: ${err.message}`);
        }
      }
    }

    // Import progress stats
    if (data.data.progressStats && Array.isArray(data.data.progressStats)) {
      for (const stat of data.data.progressStats) {
        try {
          // Use upsert to handle duplicates
          const { error } = await supabase
            .from('progress_stats')
            .upsert({
              date: stat.date,
              words_learned: stat.words_learned || 0,
              entries_written: stat.entries_written || 0,
              minutes_practiced: stat.minutes_practiced || 0
            }, {
              onConflict: 'date'
            });

          if (!error) stats.progressStats++;
        } catch (err) {
          stats.errors.push(`Progress stats error: ${err.message}`);
        }
      }
    }

    // Import settings
    if (data.data.settings && typeof data.data.settings === 'object') {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('*')
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from('user_settings')
          .update({
            daily_goal_minutes: data.data.settings.daily_goal_minutes || 60,
            daily_sentence_goal: data.data.settings.daily_sentence_goal || 10,
            theme: data.data.settings.theme || 'light'
          })
          .eq('id', existing.id);
      }
    }

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to import data',
      details: error.message
    });
  }
});

/**
 * DELETE /api/data/clear
 * Clear all user data (with confirmation)
 */
router.delete('/clear', async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'DELETE_ALL_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { "confirm": "DELETE_ALL_DATA" }'
      });
    }

    // Clear all tables
    await supabase.from('journal_entries').delete().neq('id', 0);
    await supabase.from('vocabulary').delete().neq('id', 0);
    await supabase.from('custom_phrases').delete().neq('id', 0);
    await supabase.from('progress_stats').delete().neq('id', 0);

    res.json({
      success: true,
      message: 'All data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear data'
    });
  }
});

module.exports = router;