import { Hono } from 'hono'
import { cors } from 'hono/cors'
import journal from './routes/journal.js'
import vocabulary from './routes/vocabulary.js'
import phrases from './routes/phrases.js'
import progress from './routes/progress.js'
import translate from './routes/translate.js'
import settings from './routes/settings.js'
import search from './routes/search.js'
import notes from './routes/notes.js'
import data from './routes/data.js'
import journey from './routes/journey.js'
import dailyTasks from './routes/daily-tasks.js'

const app = new Hono()

app.use('*', cors())

app.get('/health', c => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Debug endpoint to check environment variables (remove after testing)
app.get('/debug/env', c => {
    return c.json({
        hasSupabaseUrl: !!c.env.SUPABASE_URL,
        hasSupabaseKey: !!c.env.SUPABASE_ANON_KEY,
        hasGeminiKey: !!c.env.GEMINI_API_KEY,
        supabaseUrlLength: c.env.SUPABASE_URL?.length || 0,
        envKeys: Object.keys(c.env)
    })
})

app.route('/journal', journal)
app.route('/vocabulary', vocabulary)
app.route('/phrases', phrases)
app.route('/progress', progress)
app.route('/translate', translate)
app.route('/settings', settings)
app.route('/search', search)
app.route('/notes', notes)
app.route('/data', data)
app.route('/journey', journey)
app.route('/daily-tasks', dailyTasks)

export default app
