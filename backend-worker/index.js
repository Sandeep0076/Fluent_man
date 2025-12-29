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

const app = new Hono()

app.use('*', cors())

app.get('/health', c => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.route('/journal', journal)
app.route('/vocabulary', vocabulary)
app.route('/phrases', phrases)
app.route('/progress', progress)
app.route('/translate', translate)
app.route('/settings', settings)
app.route('/search', search)
app.route('/notes', notes)
app.route('/data', data)

export default app
