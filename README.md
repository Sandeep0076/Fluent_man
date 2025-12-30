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

🗺️ **30-Day Journey Map (New!)**
- Gamified learning journey with visual progress tracking
- One Piece themed nautical map with 30 waypoints
- Milestone landmarks at days 7, 14, 21, and 30
- Achievement system with unlockable badges
- Real-time progress updates from daily activities
- Celebration animations at milestones
- Mobile-responsive design

## Journey Map Feature

The 30-Day Journey Map transforms your German learning into an epic adventure! Track your progress across a nautical-themed map inspired by One Piece, with waypoints representing each day of your learning journey.

### Key Features
- **Visual Progress Tracking**: See your 30-day journey at a glance with an interactive map
- **Themed Landmarks**: Unlock special landmarks at milestone days (Grammar Fort, Vocab Island, Quiz Bridge, Treasure Island)
- **Achievement System**: Earn badges and achievements for reaching milestones and completing challenges
- **Real-time Updates**: Your map updates automatically as you complete journal entries, add vocabulary, and practice
- **Gamification**: Stay motivated with progress bars, celebrations, and visual rewards

### Quick Setup

1. **Run the database setup:**
   ```bash
   cd backend-worker
   npm run setup-journey
   ```
   Follow the instructions to run [`journey-schema.sql`](backend-worker/journey-schema.sql) in Supabase SQL Editor.

2. **Start the application:**
   ```bash
   npm run dev
   ```

3. **View your Journey Map:**
   - Open http://localhost:3000
   - Navigate to the Dashboard
   - Your journey map will display with day 1 as your current position

### Documentation
- **Full Architecture**: [`plans/journey-map-system.md`](plans/journey-map-system.md)
- **Testing Guide**: [`JOURNEY_MAP_TESTING.md`](JOURNEY_MAP_TESTING.md)
- **Implementation**: [`backend-worker/routes/journey.js`](backend-worker/routes/journey.js) and [`frontend/components/journey-map.js`](frontend/components/journey-map.js)

### Screenshot
> *[Add your journey map screenshot here]*
>
> To add a screenshot:
> 1. Take a screenshot of your journey map
> 2. Save it as `journey-map-screenshot.png` in the project root
> 3. Update this section with: `![Journey Map](journey-map-screenshot.png)`

## Technology Stack

**Backend:**
- Cloudflare Workers with Hono framework
- Supabase (PostgreSQL database)
- Google Gemini AI API for translations
- RESTful API architecture
- Serverless edge computing

**Frontend:**
- Cloudflare Pages (Static Site Hosting)
- HTML5, CSS3 (Tailwind CSS)
- Vanilla JavaScript
- Chart.js for visualizations
- One Piece anime-themed UI

**Infrastructure:**
- Cloudflare Workers for backend API
- Cloudflare Pages for frontend hosting
- Serverless deployment with global CDN
- Git-based continuous deployment

## Installation & Local Development

### Prerequisites
- Node.js v18 or higher
- npm (comes with Node.js)
- Supabase account (free tier available at https://supabase.com)
- Google Gemini API key (free tier available at https://ai.google.dev)
- Cloudflare account (free tier available - for deployment only)

### Local Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd DeutschTagebuch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd backend-worker && npm install
   cd ..
   ```

3. **Configure environment variables:**
   Create `backend-worker/.dev.vars` for local development:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up Supabase database:**
   - Create a new Supabase project at https://supabase.com
   - Go to SQL Editor in your Supabase dashboard
   - Copy and run the schema from `backend-worker/supabase-schema.sql`
   - Note your project URL and anon key from Settings → API

5. **Start development servers:**
   ```bash
   npm run dev
   ```
   This runs both:
   - Frontend at http://localhost:3000
   - Backend API at http://localhost:8789

6. **Open your browser:**
   Navigate to `http://localhost:3000`

## Deployment to Cloudflare

### Quick Deployment Guide

For detailed step-by-step instructions, see [`QUICKSTART.md`](QUICKSTART.md).

### Deployment Overview

This app is designed to run on Cloudflare's edge network:
- **Backend**: Deployed as a Cloudflare Worker
- **Frontend**: Deployed on Cloudflare Pages

### Prerequisites for Deployment
- Cloudflare account (free tier)
- GitHub account with your code in a repository
- Supabase project already set up
- Google Gemini API key

### Backend Deployment (Cloudflare Workers)

1. **Via Cloudflare Dashboard** (Recommended):
   - Go to Workers & Pages → Create Application → Create Worker
   - Connect your GitHub repository
   - Set project name: `deutschtagebuch-api`
   - Set root directory: `backend-worker`
   - Deploy

2. **Configure Environment Variables**:
   In Worker Settings → Variables and Secrets, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`

3. **Test**: Visit `https://your-worker.workers.dev/health`

### Frontend Deployment (Cloudflare Pages)

1. **Ensure `wrangler.toml` exists in project root**:
   ```toml
   name = "deutschtagebuch-frontend"
   compatibility_date = "2025-12-29"

   [assets]
   directory = "./frontend"
   ```

2. **Via Cloudflare Dashboard**:
   - Go to Workers & Pages → Create Application → Pages
   - Connect to Git → Select your repository
   - Set project name: `deutschtagebuch-frontend`
   - Framework preset: None
   - Build output directory: `frontend`
   - Deploy

3. **Update API URL** in `frontend/app.js`:
   ```javascript
   const API_BASE = 'https://your-worker-name.workers.dev';
   ```

### Deployment Verification

1. Check frontend loads at your Pages URL
2. Verify backend responds at `/health` endpoint
3. Test creating a journal entry
4. Confirm vocabulary and translation features work

### Continuous Deployment

Once connected to Git:
- Every push to `main` branch triggers automatic deployment
- Pull requests create preview deployments
- Easy rollback to previous versions in dashboard

For detailed troubleshooting and advanced deployment options, see [`QUICKSTART.md`](QUICKSTART.md).

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
   - Click "Gum Gum no" to save entry and trigger wanted poster animation

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

### Local Development Environment Variables

Create `backend-worker/.dev.vars` for local development:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Production Environment Variables (Cloudflare)

Set these in Cloudflare Dashboard → Worker Settings → Variables and Secrets:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `GEMINI_API_KEY`: Your Google Gemini API key

### Worker Configuration

Backend configuration in `backend-worker/wrangler.toml`:
```toml
name = "deutschtagebuch-api"
main = "index.js"
compatibility_date = "2024-11-01"
```

### Frontend Configuration

Frontend Pages configuration in root `wrangler.toml`:
```toml
name = "deutschtagebuch-frontend"
compatibility_date = "2025-12-29"

[assets]
directory = "./frontend"
```

### API Endpoint Configuration

Update the backend URL in `frontend/app.js`:
```javascript
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8789'
    : 'https://your-worker-name.workers.dev';
```

### Translation API
The app uses Google Gemini AI (free tier):
- High-quality AI-powered translations
- Bidirectional translation support
- Requires API key (free tier available at https://ai.google.dev)
- No CORS issues on Cloudflare Workers

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
├── frontend/                      # Cloudflare Pages (Static Site)
│   ├── index.html                # Main UI (One Piece themed)
│   ├── app.js                    # Frontend JavaScript logic
│   └── assets/                   # Images and icons
│       ├── luffy_portrait.png
│       ├── nautical_map_bg.png
│       ├── straw_hat_icon.png
│       └── wanted_poster_frame.png
├── backend-worker/                # Cloudflare Worker (API)
│   ├── index.js                  # Hono app entry point
│   ├── wrangler.toml             # Worker configuration
│   ├── .dev.vars                 # Local environment variables (not in git)
│   ├── package.json              # Worker dependencies
│   ├── supabase.js               # Supabase client
│   ├── supabase-schema.sql       # Database schema
│   ├── routes/                   # API route handlers
│   │   ├── journal.js
│   │   ├── vocabulary.js
│   │   ├── phrases.js
│   │   ├── progress.js
│   │   ├── translate.js
│   │   ├── settings.js
│   │   ├── search.js
│   │   ├── notes.js
│   │   └── data.js
│   └── services/                 # Business logic
│       ├── gemini-translation.js
│       ├── translation.js
│       └── vocabulary-extractor.js
├── wrangler.toml                  # Frontend Pages configuration
├── package.json                   # Root dev scripts
├── QUICKSTART.md                  # Deployment guide
├── README.md                      # This file
└── plans/                         # Architecture docs
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