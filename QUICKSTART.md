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
    - **Frontend**: http://localhost:8080
    - **Backend API**: http://localhost:8787

---

## 🚢 Deployment to Cloudflare

### Prerequisites for Deployment
- Cloudflare account (free tier available)
- GitHub account (for automatic deployments)
- Your code pushed to a GitHub repository

### Step 1: Deploy the Backend Worker

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy via Cloudflare Dashboard**:
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Go to **Workers & Pages**
   - Click **Create Application** → **Create Worker**
   - Click **Deploy** on the Git repository option
   - **Select your GitHub repository**
   - Configure deployment:
     - **Project name**: `deutschtagebuch-api`
     - **Production branch**: `main`
     - **Build command**: Leave empty or use `npm install`
     - **Root directory**: `backend-worker`
   - Click **Save and Deploy**

3. **Note your Worker URL** (e.g., `https://deutschtagebuch-api.your-subdomain.workers.dev`)

4. **Configure Environment Variables**:
   - In the Cloudflare dashboard, go to your worker
   - Navigate to **Settings** → **Variables and Secrets**
   - Click **Add Variable** for each of these:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
     - `GEMINI_API_KEY`: Your Google Gemini API key
   - Click **Save and Deploy** after adding all variables

5. **Test your backend**:
   - Visit: `https://deutschtagebuch-api.your-subdomain.workers.dev/health`
   - You should see: `{"status":"ok","timestamp":"..."}`

### Step 2: Update Frontend Configuration

1. **Update API URL in frontend**:
   - The file `frontend/app.js` already has dynamic configuration
   - Verify the production URL matches your deployed Worker:
   ```javascript
   const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
       ? 'http://localhost:8789'
       : 'https://deutschtagebuch-api.your-subdomain.workers.dev';
   ```

2. **Commit the changes**:
   ```bash
   git add frontend/app.js
   git commit -m "Update production API URL"
   git push origin main
   ```

### Step 3: Deploy Frontend to Cloudflare Pages

1. **Ensure wrangler.toml exists in root**:
   - A `wrangler.toml` file should exist in your project root with:
   ```toml
   name = "deutschtagebuch-frontend"
   compatibility_date = "2025-12-29"

   [assets]
   directory = "./frontend"
   ```

2. **Deploy via Cloudflare Dashboard**:
   - In Cloudflare Dashboard, go to **Workers & Pages**
   - Click **Create Application** → **Pages**
   - Click **Connect to Git**
   - **Select the same GitHub repository**
   - Configure deployment:
     - **Project name**: `deutschtagebuch-frontend`
     - **Production branch**: `main`
     - **Framework preset**: None
     - **Build command**: Leave empty (or `exit 0`)
     - **Build output directory**: `frontend`
   - Click **Save and Deploy**

3. **Wait for deployment** (usually 1-2 minutes)

4. **Your app is live!**
   - Frontend: `https://deutschtagebuch-frontend.your-pages.dev`
   - Backend: `https://deutschtagebuch-api.your-workers.dev`

### Step 4: Verify Deployment

1. **Test the frontend**:
   - Open your frontend URL
   - Check browser console for any errors
   - Try creating a journal entry

2. **Test the backend connection**:
   - The frontend should load data from the dashboard
   - Try translating text
   - Add vocabulary words

### Troubleshooting Deployment

**Backend shows 404 errors:**
- Check that environment variables are set correctly in Cloudflare dashboard
- Verify the Worker URL in `frontend/app.js` matches your deployment
- Check Worker logs in Cloudflare dashboard

**Frontend not connecting to backend:**
- Ensure the API_BASE URL in `frontend/app.js` is correct
- Check browser console for CORS errors
- Verify backend is responding at `/health` endpoint

**Database errors:**
- Confirm environment variables are set in Worker settings
- Test Supabase connection from Supabase dashboard
- Check Worker logs for detailed error messages

**Translation not working:**
- Verify GEMINI_API_KEY is set correctly
- Check Gemini API quota at ai.google.dev
- Review Worker logs for API errors

### Alternative: Deploy via Wrangler CLI

If you prefer command-line deployment:

**Backend:**
```bash
cd backend-worker
npx wrangler deploy
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put GEMINI_API_KEY
```

**Frontend:**
```bash
# From project root
npx wrangler pages deploy frontend --project-name=deutschtagebuch-frontend
```

### Continuous Deployment

Once set up via Git:
- **Automatic deployments**: Every push to `main` triggers a new deployment
- **Preview deployments**: Pull requests create preview URLs
- **Rollback**: Easily rollback to previous deployments in the dashboard

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
- `npm run dev:frontend`: Runs only the frontend (at port 8080).
- `npm run dev:backend`: Runs only the backend worker (at port 8787).

---

## 💡 Pro Learning Tips

1.  **Write Daily**: Consistency is the #1 factor in fluency.
2.  **Click German Words**: In the journal, click words to instantly add them to Nami's Maps.
3.  **Use Categories**: Organize your vocabulary by context (e.g., "Battle", "Food", "Ship").
4.  **Bounty Hunters**: Check your bounty (word count) grow on the Captain's Log!

**Viel Erfolg mit deinem Deutsch! 🇩🇪**
**Set sail for fluency with the Straw Hat Crew! ⚓🏴‍☠️**