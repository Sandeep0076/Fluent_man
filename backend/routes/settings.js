const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

/**
 * GET /api/settings
 * Get user settings
 */
router.get('/', async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          daily_goal_minutes: 60,
          daily_sentence_goal: 10,
          theme: 'light'
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/settings
 * Update user settings
 */
router.put('/', async (req, res) => {
  try {
    const { daily_goal_minutes, daily_sentence_goal, theme } = req.body;

    // Validation
    if (daily_goal_minutes !== undefined) {
      if (typeof daily_goal_minutes !== 'number' || daily_goal_minutes < 1 || daily_goal_minutes > 480) {
        return res.status(400).json({
          success: false,
          error: 'Daily goal minutes must be between 1 and 480'
        });
      }
    }

    if (daily_sentence_goal !== undefined) {
      if (typeof daily_sentence_goal !== 'number' || daily_sentence_goal < 1 || daily_sentence_goal > 100) {
        return res.status(400).json({
          success: false,
          error: 'Daily sentence goal must be between 1 and 100'
        });
      }
    }

    if (theme !== undefined) {
      if (!['light', 'dark'].includes(theme)) {
        return res.status(400).json({
          success: false,
          error: 'Theme must be either "light" or "dark"'
        });
      }
    }

    // Check if settings exist
    const { data: existing, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      // Update existing settings
      const updates = {};

      if (daily_goal_minutes !== undefined) {
        updates.daily_goal_minutes = daily_goal_minutes;
      }
      if (daily_sentence_goal !== undefined) {
        updates.daily_sentence_goal = daily_sentence_goal;
      }
      if (theme !== undefined) {
        updates.theme = theme;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated, error } = await supabase
          .from('user_settings')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        res.json({
          success: true,
          data: updated
        });
      } else {
        res.json({
          success: true,
          data: existing
        });
      }
    } else {
      // Create new settings
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

      res.status(201).json({
        success: true,
        data: newSettings
      });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

module.exports = router;