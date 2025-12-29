# DeutschTagebuch - Quick Start Guide (Cloudflare Version)

## 🎉 Welcome to Your German Learning Adventure!

Get ready to set sail on your journey to German fluency with this **Cloudflare-powered** One Piece themed learning app!

## ✅ Cloudflare Architecture

### Frontend (Cloudflare Pages)
- **Static Site**: HTML, CSS, and Vanilla JavaScript.
- **Location**: `/frontend` directory.
- **UI**: Beautiful One Piece anime-themed interface with glassmorphism.

### Backend (Cloudflare Workers + Hono)
- **Framework**: [Hono](https://hono.dev/) for high-performance serverless execution.
- **Location**: `/backend-worker` directory.
- **Database**: Supabase PostgreSQL (Cloud).
- **AI**: Google Gemini API via native `fetch`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18 or higher.
- **Cloudflare Account**: For deployment.
- **Supabase Account**: (Free tier: https://supabase.com)
- **Google Gemini API Key**: (Free tier: https://ai.google.dev)

### 2. Local Setup

1.  **Clone & Install**:
    ```bash
    npm install
    cd backend-worker && npm install
    cd ..
    ```

2.  **Environment Variables**:
    Create a file named `backend-worker/.dev.vars` (Wrangler uses this for local secrets) and add:
    ```env
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    GEMINI_API_KEY=your_gemini_api_key
    ```
    *Also keep your root `.env` for other scripts.*

3.  **Database Setup**:
    - Create a new project at https://supabase.com.
    - Go to **SQL Editor**.
    - Run the schema from `backend-worker/supabase-schema.sql`.

4.  **Run Development Servers**:
    From the root directory:
    ```bash
    npm run dev
    ```
    - **Frontend**: http://localhost:3000
    - **Backend API**: http://localhost:8787

---

## 🚢 Deployment to Cloudflare

### 1. Deploy the Backend Worker
1.  Enter the worker directory: `cd backend-worker`
2.  Deploy with Wrangler: `npx wrangler deploy`
3.  **Note your worker URL** (e.g., `https://deutschtagebuch-api.your-subdomain.workers.dev`).

### 2. Set Production Secrets
Run these commands in the `backend-worker` directory to set your secrets on Cloudflare:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put GEMINI_API_KEY
```

### 3. Update Frontend API Link
1.  Open `frontend/app.js`.
2.  Update the production URL in the `API_BASE` variable to your new Worker URL.

### 4. Deploy Frontend to Cloudflare Pages
1.  From the root directory:
    ```bash
    npx wrangler pages deploy frontend --project-name=deutschtagebuch
    ```

---

## 📁 Project Structure

```
DeutschTagebuch/
├── frontend/               # Cloudflare Pages Source
│   ├── index.html          # Main UI
│   ├── app.js              # Application Logic
│   └── assets/             # Images & Icons
├── backend-worker/         # Cloudflare Worker Source (Hono)
│   ├── index.js            # Entry Point
│   ├── supabase.js         # Supabase Client
│   ├── wrangler.toml       # Worker Config
│   ├── routes/             # API Endpoints
│   └── services/           # AI & Logic Services
├── package.json            # Root dev scripts
└── .dev.vars               # Local secrets for Wrangler
```

---

## 🛡️ Key Commands

- `npm run dev`: Runs both frontend and backend locally.
- `npm run dev:frontend`: Runs only the frontend (at port 3000).
- `npm run dev:backend`: Runs only the backend worker (at port 8787).

---

## 💡 Pro Learning Tips

1.  **Write Daily**: Consistency is the #1 factor in fluency.
2.  **Click German Words**: In the journal, click words to instantly add them to Nami's Maps.
3.  **Use Categories**: Organize your vocabulary by context (e.g., "Battle", "Food", "Ship").
4.  **Bounty Hunters**: Check your bounty (word count) grow on the Captain's Log!

**Viel Erfolg mit deinem Deutsch! 🇩🇪**
**Set sail for fluency with the Straw Hat Crew! ⚓🏴‍☠️**