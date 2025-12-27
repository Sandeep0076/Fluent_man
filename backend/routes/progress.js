const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

/**
 * GET /api/progress/stats
 * Get overall progress statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Total vocabulary
    const { count: vocabCount, error: vocabError } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });

    if (vocabError) throw vocabError;

    // Total journal entries
    const { count: entriesCount, error: entriesError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true });

    if (entriesError) throw entriesError;

    // Total words written
    const { data: totalWordsData, error: wordsError } = await supabase
      .rpc('sum_word_count');

    // If RPC doesn't exist, calculate manually
    let totalWords = 0;
    if (wordsError) {
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('word_count');
      totalWords = entries ? entries.reduce((sum, e) => sum + (e.word_count || 0), 0) : 0;
    } else {
      totalWords = totalWordsData || 0;
    }

    // Total practice time
    const { data: totalTimeData, error: timeError } = await supabase
      .rpc('sum_minutes_practiced');

    let totalTime = 0;
    if (timeError) {
      const { data: stats } = await supabase
        .from('progress_stats')
        .select('minutes_practiced');
      totalTime = stats ? stats.reduce((sum, s) => sum + (s.minutes_practiced || 0), 0) : 0;
    } else {
      totalTime = totalTimeData || 0;
    }

    // Words learned this week
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: thisWeekWords, error: weekWordsError } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .gte('first_seen', sevenDaysAgo.toISOString());

    if (weekWordsError) throw weekWordsError;

    // Entries this week
    const { count: thisWeekEntries, error: weekEntriesError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (weekEntriesError) throw weekEntriesError;

    res.json({
      success: true,
      data: {
        vocabulary: {
          total: vocabCount || 0,
          thisWeek: thisWeekWords || 0
        },
        entries: {
          total: entriesCount || 0,
          thisWeek: thisWeekEntries || 0
        },
        words: {
          total: totalWords
        },
        time: {
          total: totalTime
        }
      }
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress statistics'
    });
  }
});

/**
 * GET /api/progress/streak
 * Calculate current learning streak
 */
router.get('/streak', async (req, res) => {
  try {
    // Get all distinct dates with entries, ordered by date descending
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!entries || entries.length === 0) {
      return res.json({
        success: true,
        data: {
          current: 0,
          longest: 0,
          lastEntry: null
        }
      });
    }

    // Extract unique dates
    const dates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's an entry today or yesterday
    const lastEntryDate = new Date(dates[0]);
    lastEntryDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastEntryDate) / (1000 * 60 * 60 * 24));

    // If last entry was today or yesterday, start counting streak
    if (daysDiff <= 1) {
      currentStreak = 1;
      tempStreak = 1;

      // Count consecutive days backwards
      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i - 1]);
        const prevDate = new Date(dates[i]);
        currentDate.setHours(0, 0, 0, 0);
        prevDate.setHours(0, 0, 0, 0);

        const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diff === 1) {
          currentStreak++;
          tempStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i - 1]);
      const prevDate = new Date(dates[i]);
      currentDate.setHours(0, 0, 0, 0);
      prevDate.setHours(0, 0, 0, 0);

      const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak, 1);

    res.json({
      success: true,
      data: {
        current: currentStreak,
        longest: longestStreak,
        lastEntry: dates[0]
      }
    });
  } catch (error) {
    console.error('Error calculating streak:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate streak'
    });
  }
});

/**
 * GET /api/progress/history
 * Get daily progress history
 */
router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history, error } = await supabase
      .from('progress_stats')
      .select('date, words_learned, entries_written, minutes_practiced')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Fill in missing dates with zeros
    const result = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const existing = history?.find(h => h.date === dateStr);

      result.push({
        date: dateStr,
        words_learned: existing ? existing.words_learned : 0,
        entries_written: existing ? existing.entries_written : 0,
        minutes_practiced: existing ? existing.minutes_practiced : 0
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching progress history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress history'
    });
  }
});

/**
 * GET /api/progress/chart-data
 * Get formatted data for Chart.js
 */
router.get('/chart-data', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history, error } = await supabase
      .from('progress_stats')
      .select('date, words_learned, entries_written, minutes_practiced')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Create labels and data arrays
    const labels = [];
    const wordsData = [];
    const entriesData = [];
    const minutesData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Format label (e.g., "Mon", "Tue")
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels.push(dayNames[date.getDay()]);

      const existing = history?.find(h => h.date === dateStr);
      wordsData.push(existing ? existing.words_learned : 0);
      entriesData.push(existing ? existing.entries_written : 0);
      minutesData.push(existing ? existing.minutes_practiced : 0);
    }

    res.json({
      success: true,
      data: {
        labels,
        datasets: {
          words: wordsData,
          entries: entriesData,
          minutes: minutesData
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

module.exports = router;