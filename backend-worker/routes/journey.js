import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * Helper function: Check if day completion criteria is met
 * Primary: 10+ minutes of practice time
 * Alternative 1: 5+ vocabulary words
 * Alternative 2: All 6 daily tasks completed
 */
function isDayCompleted(activities) {
  const { minutes_practiced, vocabulary_added_count, daily_tasks_completed } = activities;
  
  // Primary criterion: 10+ minutes of practice time
  if (minutes_practiced >= 10) {
    return true;
  }
  
  // Alternative 1: Significant activity without timer
  if (vocabulary_added_count >= 5) {
    return true;
  }
  
  // Alternative 2: All daily tasks completed
  if (daily_tasks_completed === true) {
    return true;
  }
  
  return false;
}

/**
 * Helper function: Check if a day number is a milestone
 */
function isMilestone(dayNumber) {
  return [7, 14, 21, 30].includes(dayNumber);
}

/**
 * Helper function: Get milestone achievement key for a day
 */
function getMilestoneAchievementKey(dayNumber) {
  const milestoneMap = {
    7: 'day_7_milestone',
    14: 'day_14_milestone',
    21: 'day_21_milestone',
    30: 'day_30_milestone'
  };
  return milestoneMap[dayNumber] || null;
}

/**
 * Helper function: Initialize journey progress if it doesn't exist
 */
async function ensureJourneyProgress(supabase) {
  const { data: existing, error: checkError } = await supabase
    .from('journey_progress')
    .select('*')
    .eq('user_id', 1)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (!existing) {
    const { data: newProgress, error: insertError } = await supabase
      .from('journey_progress')
      .insert({
        user_id: 1,
        journey_start_date: new Date().toISOString().split('T')[0],
        current_day: 1,
        completed_days: []
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return newProgress;
  }

  return existing;
}

/**
 * GET /api/journey/status
 * Returns current journey status, progress, and next milestone
 */
router.get('/status', async (c) => {
  try {
    console.log('[DEBUG] /journey/status endpoint called');
    const supabase = getSupabaseClient(c.env);
    console.log('[DEBUG] Supabase client created successfully');
    
    // Ensure journey progress exists
    console.log('[DEBUG] Attempting to ensure journey progress...');
    const journeyProgress = await ensureJourneyProgress(supabase);
    console.log('[DEBUG] Journey progress retrieved:', journeyProgress);
    
    // Get today's activity
    const today = new Date().toISOString().split('T')[0];
    const { data: todayActivity } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('activity_date', today)
      .single();

    // Calculate progress stats
    const completedDays = journeyProgress.completed_days || [];
    const totalCompleted = completedDays.length;
    const percentage = Math.round((totalCompleted / 30) * 100);
    
    // Find next milestone
    const milestones = [7, 14, 21, 30];
    const nextMilestone = milestones.find(m => !completedDays.includes(m)) || 30;
    const daysUntilMilestone = nextMilestone - totalCompleted;

    return c.json({
      success: true,
      data: {
        journey_start_date: journeyProgress.journey_start_date,
        current_day: journeyProgress.current_day,
        completed_days: completedDays,
        total_completed: totalCompleted,
        percentage,
        next_milestone: nextMilestone,
        days_until_milestone: daysUntilMilestone,
        journey_completed_count: journeyProgress.journey_completed_count,
        today_activity: todayActivity || {
          minutes_practiced: 0,
          vocabulary_added_count: 0,
          day_completed: false
        }
      }
    });
  } catch (error) {
    console.error('[ERROR] Error fetching journey status:', error);
    console.error('[ERROR] Error code:', error.code);
    console.error('[ERROR] Error message:', error.message);
    console.error('[ERROR] Error details:', error.details);
    
    // Check if it's a missing table error
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      return c.json({
        success: false,
        error: 'Journey tables not initialized. Please run setup-journey script or journey-schema.sql in Supabase.',
        details: error.message
      }, 500);
    }
    
    return c.json({
      success: false,
      error: 'Failed to fetch journey status',
      details: error.message
    }, 500);
  }
});

/**
 * POST /api/journey/complete-day
 * Marks current day as complete and advances journey
 * Request body: { date, minutes_practiced, vocabulary_added }
 */
router.post('/complete-day', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const body = await c.req.json();
    
    const activityDate = body.date || new Date().toISOString().split('T')[0];
    const minutesPracticed = body.minutes_practiced || 0;
    const vocabularyAdded = body.vocabulary_added || 0;

    // Ensure journey progress exists
    const journeyProgress = await ensureJourneyProgress(supabase);
    
    // Check if day is already completed
    const completedDays = journeyProgress.completed_days || [];
    const currentDay = journeyProgress.current_day;
    
    if (completedDays.includes(currentDay)) {
      return c.json({
        success: true,
        message: 'Day already completed',
        day_completed: true,
        journey_day: currentDay,
        milestone_reached: false,
        achievements_unlocked: []
      });
    }

    // Check if completion criteria is met
    // First check if all daily tasks are completed
    const today = new Date().toISOString().split('T')[0];
    
    const { data: allTasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select('id');
      
    const { data: completedTasks, error: completedError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('completion_date', today)
      .not('completed_at', 'is', null);
    
    const allDailyTasksCompleted = allTasks && completedTasks && 
                                   (completedTasks.length === allTasks.length) &&
                                   allTasks.length > 0;
    
    const activities = {
      minutes_practiced: minutesPracticed,
      vocabulary_added_count: vocabularyAdded,
      daily_tasks_completed: allDailyTasksCompleted
    };
    
    console.log('[DEBUG] Journey completion check:', {
      minutes_practiced: minutesPracticed,
      vocabulary_added_count: vocabularyAdded,
      daily_tasks_completed: allDailyTasksCompleted,
      total_tasks: allTasks?.length,
      completed_tasks: completedTasks?.length
    });
    
    const dayComplete = isDayCompleted(activities);

    // Upsert daily activity
    const { error: activityError } = await supabase
      .from('daily_activities')
      .upsert({
        activity_date: activityDate,
        minutes_practiced: minutesPracticed,
        vocabulary_added_count: vocabularyAdded,
        day_completed: dayComplete,
        journey_day_number: dayComplete ? currentDay : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'activity_date'
      });

    if (activityError) throw activityError;

    if (!dayComplete) {
      return c.json({
        success: true,
        day_completed: false,
        journey_day: currentDay,
        message: 'Activity recorded, but day not yet completed. Complete 10+ minutes or 5+ vocabulary words.',
        milestone_reached: false,
        achievements_unlocked: []
      });
    }

    // Update journey progress
    const newCompletedDays = [...completedDays, currentDay];
    const nextDay = currentDay < 30 ? currentDay + 1 : currentDay;
    
    const { error: updateError } = await supabase
      .from('journey_progress')
      .update({
        current_day: nextDay,
        completed_days: newCompletedDays,
        last_activity_date: activityDate,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', 1);

    if (updateError) throw updateError;

    // Check for milestone achievements
    const milestoneReached = isMilestone(currentDay);
    const achievementsUnlocked = [];

    if (milestoneReached) {
      const achievementKey = getMilestoneAchievementKey(currentDay);
      
      if (achievementKey) {
        const { data: achievement, error: achError } = await supabase
          .from('achievements')
          .update({
            unlocked_at: new Date().toISOString(),
            journey_day: currentDay
          })
          .eq('achievement_key', achievementKey)
          .select()
          .single();

        if (!achError && achievement) {
          achievementsUnlocked.push(achievement);
        }

        // Unlock corresponding landmark
        const landmarkMap = {
          7: 'grammar_fort',
          14: 'vocab_island',
          21: 'quiz_bridge',
          30: 'treasure_island'
        };
        
        const landmarkKey = landmarkMap[currentDay];
        if (landmarkKey) {
          await supabase
            .from('journey_landmarks')
            .update({
              unlocked: true,
              unlocked_at: new Date().toISOString()
            })
            .eq('landmark_key', landmarkKey);
        }
      }

      // Check for first journey completion
      if (currentDay === 30) {
        const { error: journeyCompleteError } = await supabase
          .from('achievements')
          .update({
            unlocked_at: new Date().toISOString(),
            journey_day: 30
          })
          .eq('achievement_key', 'first_journey_complete');

        if (!journeyCompleteError) {
          const { data: firstJourneyAch } = await supabase
            .from('achievements')
            .select('*')
            .eq('achievement_key', 'first_journey_complete')
            .single();
          
          if (firstJourneyAch) {
            achievementsUnlocked.push(firstJourneyAch);
          }
        }
      }
    }

    // Check for special achievements
    if (minutesPracticed >= 50) {
      const { data: existingAch } = await supabase
        .from('achievements')
        .select('unlocked_at')
        .eq('achievement_key', 'dedicated_pirate')
        .single();

      if (existingAch && !existingAch.unlocked_at) {
        await supabase
          .from('achievements')
          .update({
            unlocked_at: new Date().toISOString(),
            journey_day: currentDay
          })
          .eq('achievement_key', 'dedicated_pirate');
      }
    }

    if (vocabularyAdded >= 20) {
      const { data: existingAch } = await supabase
        .from('achievements')
        .select('unlocked_at')
        .eq('achievement_key', 'word_hoarder')
        .single();

      if (existingAch && !existingAch.unlocked_at) {
        await supabase
          .from('achievements')
          .update({
            unlocked_at: new Date().toISOString(),
            journey_day: currentDay
          })
          .eq('achievement_key', 'word_hoarder');
      }
    }

    return c.json({
      success: true,
      day_completed: true,
      journey_day: currentDay,
      next_day: nextDay,
      milestone_reached: milestoneReached,
      achievements_unlocked: achievementsUnlocked,
      total_completed: newCompletedDays.length,
      percentage: Math.round((newCompletedDays.length / 30) * 100)
    });
  } catch (error) {
    console.error('Error completing day:', error);
    return c.json({
      success: false,
      error: 'Failed to complete day'
    }, 500);
  }
});

/**
 * GET /api/journey/achievements
 * Returns all achievements with their unlock status
 */
router.get('/achievements', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    
    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('*')
      .order('unlocked_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    const unlocked = achievements.filter(a => a.unlocked_at !== null);
    const locked = achievements.filter(a => a.unlocked_at === null);

    return c.json({
      success: true,
      data: {
        unlocked,
        locked,
        total_unlocked: unlocked.length,
        total_achievements: achievements.length
      }
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch achievements'
    }, 500);
  }
});

/**
 * GET /api/journey/landmarks
 * Returns all landmarks with their unlock status
 */
router.get('/landmarks', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    
    const { data: landmarks, error } = await supabase
      .from('journey_landmarks')
      .select('*')
      .order('day_number', { ascending: true });

    if (error) throw error;

    return c.json({
      success: true,
      data: landmarks
    });
  } catch (error) {
    console.error('Error fetching landmarks:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch landmarks'
    }, 500);
  }
});

/**
 * POST /api/journey/reset
 * Starts a new 30-day journey (after completion or manual reset)
 */
router.post('/reset', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    
    // Get current journey progress
    const { data: currentProgress } = await supabase
      .from('journey_progress')
      .select('*')
      .eq('user_id', 1)
      .single();

    const completedCount = currentProgress ? currentProgress.journey_completed_count : 0;
    const newCount = currentProgress && currentProgress.completed_days.length === 30 
      ? completedCount + 1 
      : completedCount;

    // Reset journey progress
    const { error: updateError } = await supabase
      .from('journey_progress')
      .update({
        journey_start_date: new Date().toISOString().split('T')[0],
        current_day: 1,
        completed_days: [],
        last_activity_date: null,
        journey_completed_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', 1);

    if (updateError) throw updateError;

    // Reset landmarks
    await supabase
      .from('journey_landmarks')
      .update({
        unlocked: false,
        unlocked_at: null
      })
      .neq('id', 0); // Update all

    // Reset milestone achievements (keep special achievements)
    await supabase
      .from('achievements')
      .update({
        unlocked_at: null,
        journey_day: null
      })
      .eq('category', 'milestone');

    return c.json({
      success: true,
      message: 'Journey reset successfully',
      new_journey_start_date: new Date().toISOString().split('T')[0],
      journey_count: newCount
    });
  } catch (error) {
    console.error('Error resetting journey:', error);
    return c.json({
      success: false,
      error: 'Failed to reset journey'
    }, 500);
  }
});

/**
 * POST /api/journey/update-activity
 * Updates today's activity metrics (called by timer/vocab systems)
 * Request body: { minutes_practiced?, vocabulary_added? }
 */
router.post('/update-activity', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const body = await c.req.json();
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get current activity or create new
    const { data: currentActivity } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('activity_date', today)
      .single();

    const minutesPracticed = (currentActivity?.minutes_practiced || 0) + (body.minutes_practiced || 0);
    const vocabularyAdded = (currentActivity?.vocabulary_added_count || 0) + (body.vocabulary_added || 0);

    // Check if day should be auto-completed
    // First check if all daily tasks are completed
    const { data: allTasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select('id');
      
    const { data: completedTasks, error: completedError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('completion_date', today)
      .not('completed_at', 'is', null);
    
    const allDailyTasksCompleted = allTasks && completedTasks && 
                                   (completedTasks.length === allTasks.length) &&
                                   allTasks.length > 0;
    
    const activities = {
      minutes_practiced: minutesPracticed,
      vocabulary_added_count: vocabularyAdded,
      daily_tasks_completed: allDailyTasksCompleted
    };
    
    const dayComplete = isDayCompleted(activities);
    let journeyDayNumber = currentActivity?.journey_day_number || null;

    // If day just became complete, get current journey day
    if (dayComplete && !currentActivity?.day_completed) {
      const { data: journeyProgress } = await supabase
        .from('journey_progress')
        .select('current_day')
        .eq('user_id', 1)
        .single();
      
      journeyDayNumber = journeyProgress?.current_day || null;
    }

    // Upsert daily activity
    const { error: activityError } = await supabase
      .from('daily_activities')
      .upsert({
        activity_date: today,
        minutes_practiced: minutesPracticed,
        vocabulary_added_count: vocabularyAdded,
        day_completed: dayComplete,
        journey_day_number: journeyDayNumber,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'activity_date'
      });

    if (activityError) throw activityError;

    return c.json({
      success: true,
      day_completed: dayComplete,
      activities: {
        minutes_practiced: minutesPracticed,
        vocabulary_added_count: vocabularyAdded
      }
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    return c.json({
      success: false,
      error: 'Failed to update activity'
    }, 500);
  }
});

export default router