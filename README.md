# DeutschTagebuch - Daily German Learning App

A full-stack web application for daily German language practice with AI-powered translation, vocabulary tracking, and progress monitoring. Features a unique One Piece anime-themed interface for an engaging learning experience.

## Features

✨ **Daily Journal Writing (Zoro's Training)**
- Write in English and get automatic German translations
- Bullet-point based writing system
- Click German words to add them to vocabulary
- Track your daily writing practice
- Review and edit past entries with search functionality

📚 **Vocabulary Bank (Nami's Maps)**
- Automatic vocabulary extraction from your German writing
- Organize words into custom categories/folders
- Track word frequency and learning dates
- Search across vocabulary and journal entries
- Click to reveal German meanings
- Statistics on learning progress

💬 **Common Phrases (Brook's Songs)**
- Built-in useful German phrases
- One Piece themed presentation
- Practice with reveal/hide functionality

📊 **Progress Tracking (Captain's Log)**
- Daily streak counter with personal best
- Active days-based leveling system
- Learning statistics and charts
- Visual progress over time with Chart.js
- Session timer tracking

📝 **Notes System (Meat & Tips)**
- Create and manage personal notes
- Sort by date or alphabetically
- Edit and delete notes
- One Piece themed interface

🌐 **AI-Powered Translation**
- Google Gemini AI for high-quality translations
- Bidirectional translation (English ↔ German)
- Handles multiple sentences and complex text

## Technology Stack

**Backend:**
- Node.js & Express.js
- Supabase (PostgreSQL database)
- Google Gemini AI API for translations
- RESTful API architecture

**Frontend:**
- HTML5, CSS3 (Tailwind CSS)
- Vanilla JavaScript
- Chart.js for visualizations
- One Piece anime-themed UI

## Installation

### Prerequisites
- Node.js v18 or higher
- npm (comes with Node.js)
- Supabase account (free tier available)
- Google Gemini API key (free tier available)

### Setup Steps

1. **Clone or navigate to the project directory:**
   ```bash
   cd DeutschTagebuch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3000
   ```

4. **Set up Supabase database:**
   - Create a new Supabase project
   - Run the schema from `backend/supabase-schema.sql`
   - Configure your environment variables

5. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### First Time Setup
1. Ensure your `.env` file is configured with Supabase and Gemini credentials
2. The app will connect to your Supabase database
3. Default settings are configured (60 min daily goal)
4. Start writing in Zoro's Training (Daily Journal) section!

### Daily Workflow

1. **Write Your Journal Entry (Zoro's Training):**
   - Navigate to "Zoro's Training" section
   - Write sentences in English using bullet points (press Enter for new bullet)
   - Click "Translate" to get AI-powered German translation
   - Edit the German version if needed
   - Click German words to add them directly to vocabulary
   - Click "Save Dash Slash" to save entry and trigger wanted poster animation

2. **Review Vocabulary (Nami's Maps):**
   - Visit "Nami's Navigation Room" to see all learned words
   - Words are automatically extracted from your German writing
   - Organize words into custom folders/categories
   - Click words to reveal German meanings
   - Search across vocabulary and journal entries
   - Track learning statistics

3. **Practice Phrases (Brook's Songs):**
   - Use "Brook's Songs" section for useful expressions
   - Click cards to reveal German translations
   - One Piece themed presentation

4. **Track Progress (Captain's Log):**
   - Dashboard shows your current streak and personal best
   - Level up based on active days of practice
   - View charts of words learned over time
   - Monitor your daily practice time with session timer

5. **Manage Notes (Meat & Tips):**
   - Create personal notes for learning tips or motivation
   - Edit and organize your notes
   - Sort by date or alphabetically

### Data Management

**Export Your Data:**
```bash
GET http://localhost:3000/api/data/export
```

**Import Data:**
```bash
POST http://localhost:3000/api/data/import
Content-Type: application/json

{
  "data": { /* your exported data */ },
  "mode": "merge"  // or "replace"
}
```

**Clear All Data:**
```bash
DELETE http://localhost:3000/api/data/clear
```

## API Endpoints

### Journal
- `POST /api/journal/entry` - Create journal entry
- `GET /api/journal/entries?title=&sort=newest&limit=50` - Get all entries (with filters)
- `GET /api/journal/entry/:id` - Get specific entry
- `PUT /api/journal/entry/:id` - Update entry
- `DELETE /api/journal/entry/:id` - Delete entry

### Vocabulary
- `GET /api/vocabulary?sort=newest` - Get all vocabulary
- `GET /api/vocabulary/stats` - Get statistics
- `GET /api/vocabulary/:id/meaning` - Get word meaning
- `POST /api/vocabulary` - Add word manually
- `DELETE /api/vocabulary/:id` - Delete word
- `GET /api/vocabulary/categories` - Get all categories
- `POST /api/vocabulary/categories` - Create category
- `DELETE /api/vocabulary/categories/:id` - Delete category

### Phrases
- `GET /api/phrases` - Get all phrases (built-in + custom)
- `POST /api/phrases` - Add custom phrase
- `DELETE /api/phrases/:id` - Delete custom phrase

### Progress
- `GET /api/progress/stats` - Overall statistics
- `GET /api/progress/streak` - Current streak
- `GET /api/progress/active-days` - Get active days count (for leveling)
- `GET /api/progress/history?days=7` - Daily history
- `GET /api/progress/chart-data?days=7` - Chart.js formatted data

### Translation
- `POST /api/translate` - Translate English to German (Gemini AI)
  ```json
  {
    "text": "Hello, how are you?",
    "multiSentence": true
  }
  ```
- `POST /api/translate/reverse` - Translate German to English
  ```json
  {
    "text": "Guten Tag"
  }
  ```

### Search
- `GET /api/search?q=term` - Unified search across vocabulary and journal entries

### Notes
- `GET /api/notes?sort=newest` - Get all notes
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Data Management
- `GET /api/data/export` - Export all data as JSON
- `POST /api/data/import` - Import data from backup
- `DELETE /api/data/clear` - Clear all data (requires confirmation)

### Health Check
- `GET /api/health` - Server health check

## Database Schema

The Supabase PostgreSQL database contains:

- **journal_entries** - Your daily writing entries with bullet points
- **vocabulary** - Extracted German words with frequency and categories
- **vocabulary_categories** - Custom folders for organizing words
- **phrases** - Built-in and custom phrases
- **notes** - Personal notes and tips
- **user_settings** - App preferences
- **progress_stats** - Daily learning statistics

See `backend/supabase-schema.sql` for complete schema details.

## Configuration

### Environment Variables
Create a `.env` file with:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

### Port Configuration
Default port is 3000. To change, update the `PORT` variable in `.env`

### Translation API
The app uses Google Gemini AI (free tier):
- High-quality AI-powered translations
- Bidirectional translation support
- Requires API key (free tier available at ai.google.dev)

## Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use
- Ensure Node.js v18+ is installed: `node --version`
- Verify `.env` file exists with correct credentials
- Delete `node_modules` and run `npm install` again

**Translation not working:**
- Check internet connection
- Verify `GEMINI_API_KEY` is set correctly in `.env`
- Check Gemini API quota at ai.google.dev
- Check browser console and server logs for error messages

**Database errors:**
- Verify Supabase credentials in `.env`
- Check Supabase project status
- Ensure database schema is properly set up
- Check server logs for connection errors

**Frontend not loading:**
- Clear browser cache
- Check browser console for errors
- Ensure server is running on correct port
- Verify all static assets are present in `assets/` folder

**Vocabulary not extracting:**
- Ensure German text is properly formatted
- Check that journal entry was saved successfully
- Verify vocabulary extraction service is working in server logs

## Development

### Project Structure
```
DeutschTagebuch/
├── index.html              # Frontend UI (One Piece themed)
├── app.js                  # Frontend JavaScript logic
├── server.js               # Express server
├── package.json            # Dependencies
├── .env                    # Environment variables (not in git)
├── assets/                 # Images and icons
│   ├── luffy_portrait.png
│   ├── nautical_map_bg.png
│   ├── straw_hat_icon.png
│   └── wanted_poster_frame.png
├── backend/
│   ├── supabase.js         # Supabase client initialization
│   ├── supabase-schema.sql # Database schema
│   ├── routes/             # API route handlers
│   │   ├── journal.js
│   │   ├── vocabulary.js
│   │   ├── phrases.js
│   │   ├── progress.js
│   │   ├── translate.js
│   │   ├── settings.js
│   │   ├── search.js
│   │   ├── notes.js
│   │   └── data.js
│   └── services/           # Business logic
│       ├── gemini-translation.js
│       ├── translation.js
│       └── vocabulary-extractor.js
└── plans/                  # Architecture docs
    └── architecture.md
```

### Adding New Features
1. Create route handler in `backend/routes/`
2. Add route to `server.js`
3. Update frontend in `app.js` to call new endpoint
4. Update UI in `index.html` if needed
5. Test thoroughly with Supabase backend

### Theme Customization
The app uses a One Piece anime theme with custom CSS variables:
- `--op-red`: #D70000
- `--op-yellow`: #FFCE00
- `--op-blue`: #2E63A4
- `--op-wood`: #AF6528

Modify these in `index.html` to customize the color scheme.

## License

MIT License - Feel free to use and modify for your learning journey!

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check browser console and server logs

---

**Happy Learning! Viel Erfolg! 🇩🇪**