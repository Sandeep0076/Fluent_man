import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * GET /api/settings
 * Get user settings
 */
router.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!settings) {
      return c.json({
        success: true,
        data: {
          daily_goal_minutes: 60,
          daily_sentence_goal: 10,
          theme: 'light'
        }
      });
    }

    return c.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch settings'
    }, 500);
  }
});

/**
 * PUT /api/settings
 * Update user settings
 */
router.put('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const { daily_goal_minutes, daily_sentence_goal, theme } = await c.req.json();

    // Validation
    if (daily_goal_minutes !== undefined) {
      if (typeof daily_goal_minutes !== 'number' || daily_goal_minutes < 1 || daily_goal_minutes > 480) {
        return c.json({
          success: false,
          error: 'Daily goal minutes must be between 1 and 480'
        }, 400);
      }
    }

    if (daily_sentence_goal !== undefined) {
      if (typeof daily_sentence_goal !== 'number' || daily_sentence_goal < 1 || daily_sentence_goal > 100) {
        return c.json({
          success: false,
          error: 'Daily sentence goal must be between 1 and 100'
        }, 400);
      }
    }

    if (theme !== undefined) {
      if (!['light', 'dark'].includes(theme)) {
        return c.json({
          success: false,
          error: 'Theme must be either "light" or "dark"'
        }, 400);
      }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      const updates = {};
      if (daily_goal_minutes !== undefined) updates.daily_goal_minutes = daily_goal_minutes;
      if (daily_sentence_goal !== undefined) updates.daily_sentence_goal = daily_sentence_goal;
      if (theme !== undefined) updates.theme = theme;

      if (Object.keys(updates).length > 0) {
        const { data: updated, error } = await supabase
          .from('user_settings')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        return c.json({ success: true, data: updated });
      } else {
        return c.json({ success: true, data: existing });
      }
    } else {
      const { data: newSettings, error } = await supabase
        .from('user_settings')
        .insert({
          daily_goal_minutes: daily_goal_minutes || 60,
          daily_sentence_goal: daily_sentence_goal || 10,
          theme: theme || 'light'
        })
        .select()
        .single();

      if (error) throw error;

      return c.json({ success: true, data: newSettings }, 201);
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return c.json({ success: false, error: 'Failed to update settings' }, 500);
  }
});

export default router