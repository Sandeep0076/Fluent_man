import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

/**
 * GET /api/daily-tasks
 * Get all daily tasks with today's progress
 */
router.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)
    const today = new Date().toISOString().split('T')[0]

    // Get all task definitions
    const { data: tasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select('*')
      .order('display_order', { ascending: true })

    if (tasksError) throw tasksError

    // Get today's progress
    const { data: progress, error: progressError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('completion_date', today)

    if (progressError) throw progressError

    // Merge tasks with progress
    const tasksWithProgress = tasks.map(task => {
      const taskProgress = progress?.find(p => p.task_id === task.id)
      return {
        id: task.id,
        name: task.name,
        duration_minutes: task.duration_minutes,
        display_order: task.display_order,
        icon: task.icon,
        completed: !!taskProgress?.completed_at,
        in_progress: !!taskProgress?.started_at && !taskProgress?.completed_at,
        started_at: taskProgress?.started_at || null,
        completed_at: taskProgress?.completed_at || null
      }
    })

    const completedCount = tasksWithProgress.filter(t => t.completed).length
    const allCompleted = completedCount === tasks.length

    return c.json({
      success: true,
      data: {
        tasks: tasksWithProgress,
        completed_count: completedCount,
        total_tasks: tasks.length,
        all_completed: allCompleted,
        date: today
      }
    })
  } catch (error) {
    console.error('Error fetching daily tasks:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch daily tasks'
    }, 500)
  }
})

/**
 * POST /api/daily-tasks/:id/start
 * Start a task timer
 */
router.post('/:id/start', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)
    const taskId = parseInt(c.req.param('id'))
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Check if task exists
    const { data: task, error: taskError } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return c.json({
        success: false,
        error: 'Task not found'
      }, 404)
    }

    // Check if already completed today
    const { data: existing, error: existingError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('task_id', taskId)
      .eq('completion_date', today)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError
    }

    if (existing?.completed_at) {
      return c.json({
        success: false,
        error: 'Task already completed today'
      }, 400)
    }

    // Insert or update progress
    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('daily_task_progress')
        .update({ started_at: now })
        .eq('id', existing.id)

      if (updateError) throw updateError
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('daily_task_progress')
        .insert({
          task_id: taskId,
          completion_date: today,
          started_at: now
        })

      if (insertError) throw insertError
    }

    return c.json({
      success: true,
      data: {
        task_id: taskId,
        started_at: now,
        duration_minutes: task.duration_minutes
      }
    })
  } catch (error) {
    console.error('Error starting task:', error)
    return c.json({
      success: false,
      error: 'Failed to start task'
    }, 500)
  }
})

/**
 * POST /api/daily-tasks/:id/complete
 * Mark a task as complete
 */
router.post('/:id/complete', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)
    const taskId = parseInt(c.req.param('id'))
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Get the progress record
    const { data: progress, error: progressError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('task_id', taskId)
      .eq('completion_date', today)
      .single()

    if (progressError) {
      return c.json({
        success: false,
        error: 'Task not started yet'
      }, 400)
    }

    if (progress.completed_at) {
      return c.json({
        success: false,
        error: 'Task already completed'
      }, 400)
    }

    // Mark as completed
    const { error: updateError } = await supabase
      .from('daily_task_progress')
      .update({ completed_at: now })
      .eq('id', progress.id)

    if (updateError) throw updateError

    // Check if all tasks are completed
    const { data: allTasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select('id')

    if (tasksError) throw tasksError

    const { data: allProgress, error: allProgressError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('completion_date', today)
      .not('completed_at', 'is', null)

    if (allProgressError) throw allProgressError

    const allCompleted = allProgress?.length === allTasks?.length

    return c.json({
      success: true,
      data: {
        task_id: taskId,
        completed_at: now,
        all_tasks_completed: allCompleted
      }
    })
  } catch (error) {
    console.error('Error completing task:', error)
    return c.json({
      success: false,
      error: 'Failed to complete task'
    }, 500)
  }
})

/**
 * GET /api/daily-tasks/progress
 * Get current day's progress summary
 */
router.get('/progress', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)
    const today = new Date().toISOString().split('T')[0]

    const { data: allTasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select('id')

    if (tasksError) throw tasksError

    const { data: completedTasks, error: progressError } = await supabase
      .from('daily_task_progress')
      .select('*')
      .eq('completion_date', today)
      .not('completed_at', 'is', null)

    if (progressError) throw progressError

    const totalTasks = allTasks?.length || 0
    const completedCount = completedTasks?.length || 0
    const allCompleted = completedCount === totalTasks && totalTasks > 0

    return c.json({
      success: true,
      data: {
        date: today,
        completed_tasks: completedCount,
        total_tasks: totalTasks,
        all_completed: allCompleted,
        completion_percentage: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
      }
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch progress'
    }, 500)
  }
})

/**
 * GET /api/daily-tasks/history
 * Get task completion history for the last N days
 */
router.get('/history', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env)
    const days = parseInt(c.req.query('days')) || 7
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    const { data: history, error } = await supabase
      .from('daily_task_progress')
      .select('completion_date, task_id, completed_at')
      .gte('completion_date', startDateStr)
      .not('completed_at', 'is', null)
      .order('completion_date', { ascending: false })

    if (error) throw error

    // Group by date
    const historyByDate = {}
    history?.forEach(record => {
      if (!historyByDate[record.completion_date]) {
        historyByDate[record.completion_date] = []
      }
      historyByDate[record.completion_date].push(record)
    })

    return c.json({
      success: true,
      data: {
        history: historyByDate,
        days_requested: days
      }
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch history'
    }, 500)
  }
})

export default router