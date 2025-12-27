# DeutschTagebuch - Daily German Learning App

A full-stack web application for daily German language practice with automatic translation, vocabulary tracking, and progress monitoring.

## Features

✨ **Daily Journal Writing**
- Write in English and get automatic German translations
- Track your daily writing practice
- Review past entries with search functionality

📚 **Vocabulary Bank**
- Automatic vocabulary extraction from your German writing
- Track word frequency and learning dates
- Search and filter your vocabulary
- Statistics on learning progress

💬 **Common Phrases**
- Built-in useful German phrases
- Add your own custom phrases
- Practice with reveal/hide functionality

📊 **Progress Tracking**
- Daily streak counter
- Learning statistics and charts
- Export/import your data for backup
- Visual progress over time

🌐 **Translation**
- Automatic English to German translation
- Uses MyMemory Translation API (free, no API key needed)
- Handles multiple sentences

## Technology Stack

**Backend:**
- Node.js & Express.js
- SQLite3 database (better-sqlite3)
- MyMemory Translation API

**Frontend:**
- HTML5, CSS3 (Tailwind CSS)
- Vanilla JavaScript
- Chart.js for visualizations

## Installation

### Prerequisites
- Node.js v18 or higher
- npm (comes with Node.js)

### Setup Steps

1. **Clone or navigate to the project directory:**
   ```bash
   cd DeutschTagebuch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### First Time Setup
1. The app will automatically create the SQLite database on first run
2. Default settings are configured (60 min daily goal, 10 sentences)
3. Start writing in the Daily Journal section!

### Daily Workflow

1. **Write Your Journal Entry:**
   - Go to "Daily Journal" section
   - Write 10-15 sentences in English (left panel)
   - Click "Translate" to get German translation
   - Edit the German version if needed
   - Click "Process & Save" to save and extract vocabulary

2. **Review Vocabulary:**
   - Visit "Vocabulary Bank" to see all learned words
   - Words are automatically extracted from your German writing
   - Search and filter your vocabulary
   - Track learning statistics

3. **Practice Phrases:**
   - Use "Common Phrases" section for useful expressions
   - Click cards to reveal German translations
   - Add your own custom phrases

4. **Track Progress:**
   - Dashboard shows your current streak
   - View charts of words learned over time
   - Monitor your daily practice time

### Data Management

**Export Your Data:**
```bash
GET http://localhost:3000/api/data/export
```
Or use the frontend export button (when implemented)

**Import Data:**
```bash
POST http://localhost:3000/api/data/import
Content-Type: application/json

{
  "data": { /* your exported data */ },
  "mode": "merge"  // or "replace"
}
```

## API Endpoints

### Journal
- `POST /api/journal/entry` - Create journal entry
- `GET /api/journal/entries` - Get all entries (paginated)
- `GET /api/journal/entry/:id` - Get specific entry
- `PUT /api/journal/entry/:id` - Update entry
- `DELETE /api/journal/entry/:id` - Delete entry
- `GET /api/journal/search?q=term` - Search entries

### Vocabulary
- `GET /api/vocabulary` - Get all vocabulary
- `GET /api/vocabulary/stats` - Get statistics
- `POST /api/vocabulary` - Add word manually
- `DELETE /api/vocabulary/:id` - Delete word

### Phrases
- `GET /api/phrases` - Get all phrases
- `POST /api/phrases` - Add custom phrase
- `DELETE /api/phrases/:id` - Delete custom phrase

### Progress
- `GET /api/progress/stats` - Overall statistics
- `GET /api/progress/streak` - Current streak
- `GET /api/progress/history?days=7` - Daily history
- `GET /api/progress/chart-data?days=7` - Chart.js formatted data

### Translation
- `POST /api/translate` - Translate English to German
  ```json
  {
    "text": "Hello, how are you?",
    "multiSentence": false
  }
  ```

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Data Management
- `GET /api/data/export` - Export all data as JSON
- `POST /api/data/import` - Import data from backup
- `DELETE /api/data/clear` - Clear all data (requires confirmation)

## Database Schema

The SQLite database (`deutschtagebuch.db`) contains:

- **journal_entries** - Your daily writing entries
- **vocabulary** - Extracted German words with frequency
- **custom_phrases** - User-added phrases
- **user_settings** - App preferences
- **progress_stats** - Daily learning statistics

## Configuration

### Port Configuration
Default port is 3000. To change:
```bash
PORT=8080 npm start
```

### Translation API
The app uses MyMemory Translation API (free tier):
- 1000 requests per day
- No API key required
- Automatic rate limiting with delays

## Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use
- Ensure Node.js v18+ is installed: `node --version`
- Delete `node_modules` and run `npm install` again

**Translation not working:**
- Check internet connection
- MyMemory API has daily limits (1000 requests)
- Check browser console for error messages

**Database errors:**
- Delete `deutschtagebuch.db` to reset (will lose all data)
- Export data first if you want to keep it

**Frontend not loading:**
- Clear browser cache
- Check browser console for errors
- Ensure server is running on correct port

## Development

### Project Structure
```
DeutschTagebuch/
├── index.html              # Frontend UI
├── server.js               # Express server
├── package.json            # Dependencies
├── deutschtagebuch.db      # SQLite database (auto-created)
├── backend/
│   ├── database.js         # Database initialization
│   ├── routes/             # API route handlers
│   │   ├── journal.js
│   │   ├── vocabulary.js
│   │   ├── phrases.js
│   │   ├── progress.js
│   │   ├── translate.js
│   │   ├── settings.js
│   │   └── data.js
│   └── services/           # Business logic
│       ├── translation.js
│       └── vocabulary-extractor.js
└── plans/                  # Architecture docs
    └── architecture.md
```

### Adding New Features
1. Create route handler in `backend/routes/`
2. Add route to `server.js`
3. Update frontend to call new endpoint
4. Test thoroughly

## License

MIT License - Feel free to use and modify for your learning journey!

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check browser console and server logs

---

**Happy Learning! Viel Erfolg! 🇩🇪**