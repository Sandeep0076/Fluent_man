import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * GET /api/progress/stats
 * Get overall progress statistics
 */
router.get('/stats', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { count: vocabCount, error: vocabError } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });

    if (vocabError) throw vocabError;

    const { count: entriesCount, error: entriesError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true });

    if (entriesError) throw entriesError;

    const { data: totalWordsData, error: wordsError } = await supabase.rpc('sum_word_count');

    let totalWords = 0;
    if (wordsError) {
      const { data: entries } = await supabase.from('journal_entries').select('word_count');
      totalWords = entries ? entries.reduce((sum, e) => sum + (e.word_count || 0), 0) : 0;
    } else {
      totalWords = totalWordsData || 0;
    }

    const { data: totalTimeData, error: timeError } = await supabase.rpc('sum_minutes_practiced');

    let totalTime = 0;
    if (timeError) {
      const { data: stats } = await supabase.from('progress_stats').select('minutes_practiced');
      totalTime = stats ? stats.reduce((sum, s) => sum + (s.minutes_practiced || 0), 0) : 0;
    } else {
      totalTime = totalTimeData || 0;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: thisWeekWords, error: weekWordsError } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .gte('first_seen', sevenDaysAgo.toISOString());

    if (weekWordsError) throw weekWordsError;

    const { count: thisWeekEntries, error: weekEntriesError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (weekEntriesError) throw weekEntriesError;

    return c.json({
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
        words: { total: totalWords },
        time: { total: totalTime }
      }
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch progress statistics'
    }, 500);
  }
});

/**
 * GET /api/progress/streak
 * Calculate current learning streak
 */
router.get('/streak', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!entries || entries.length === 0) {
      return c.json({
        success: true,
        data: { current: 0, longest: 0, lastEntry: null }
      });
    }

    const dates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastEntryDate = new Date(dates[0]);
    lastEntryDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastEntryDate) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      currentStreak = 1;
      tempStreak = 1;

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

    return c.json({
      success: true,
      data: {
        current: currentStreak,
        longest: longestStreak,
        lastEntry: dates[0]
      }
    });
  } catch (error) {
    console.error('Error calculating streak:', error);
    return c.json({
      success: false,
      error: 'Failed to calculate streak'
    }, 500);
  }
});

/**
 * GET /api/progress/history
 */
router.get('/history', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const days = parseInt(c.req.query('days')) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history, error } = await supabase
      .from('progress_stats')
      .select('date, words_learned, entries_written, minutes_practiced')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

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

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching progress history:', error);
    return c.json({ success: false, error: 'Failed to fetch progress history' }, 500);
  }
});

/**
 * GET /api/progress/chart-data
 */
router.get('/chart-data', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const days = parseInt(c.req.query('days')) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history, error } = await supabase
      .from('progress_stats')
      .select('date, words_learned, entries_written, minutes_practiced')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    const labels = [];
    const wordsData = [];
    const entriesData = [];
    const minutesData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels.push(dayNames[date.getDay()]);

      const existing = history?.find(h => h.date === dateStr);
      wordsData.push(existing ? existing.words_learned : 0);
      entriesData.push(existing ? existing.entries_written : 0);
      minutesData.push(existing ? existing.minutes_practiced : 0);
    }

    return c.json({
      success: true,
      data: {
        labels,
        datasets: { words: wordsData, entries: entriesData, minutes: minutesData }
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return c.json({ success: false, error: 'Failed to fetch chart data' }, 500);
  }
});

/**
 * GET /api/progress/active-days
 */
router.get('/active-days', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: journalDates, error: journalError } = await supabase
      .from('journal_entries')
      .select('created_at');

    if (journalError) throw journalError;

    const { data: vocabDates, error: vocabError } = await supabase
      .from('vocabulary')
      .select('first_seen');

    if (vocabError) throw vocabError;

    const { data: progressDates, error: progressError } = await supabase
      .from('progress_stats')
      .select('date');

    if (progressError) throw progressError;

    const allDates = new Set();
    if (journalDates) journalDates.forEach(e => allDates.add(e.created_at.split('T')[0]));
    if (vocabDates) vocabDates.forEach(v => allDates.add(v.first_seen.split('T')[0]));
    if (progressDates) progressDates.forEach(p => allDates.add(p.date));

    return c.json({
      success: true,
      data: {
        activeDays: allDates.size,
        dates: Array.from(allDates).sort().reverse()
      }
    });
  } catch (error) {
    console.error('Error calculating active days:', error);
    return c.json({ success: false, error: 'Failed to calculate active days' }, 500);
  }
});

export default router