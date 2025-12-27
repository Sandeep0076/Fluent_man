# Step-by-Step Migration Guide

This document provides a complete step-by-step guide to migrate your DeutschTagebuch app from SQLite to Supabase.

---

## ✅ What's Already Done

I've already completed the following for you:

1. ✅ Created `backend/supabase.js` - Supabase client initialization
2. ✅ Created `backend/supabase-schema.sql` - SQL script to create all tables
3. ✅ Created `backend/migrate-to-supabase.js` - Data migration script
4. ✅ Updated all 7 route files to use Supabase
5. ✅ Updated `vocabulary-extractor.js` service
6. ✅ Updated `package.json` dependencies
7. ✅ Updated `server.js` startup message

---

## 📋 What You Need to Do

Follow these steps in order:

### Step 1: Create Supabase Account (5 minutes)

1. Go to **https://supabase.com**
2. Click "Start your project" or "Sign Up"
3. Sign up with GitHub, Google, or email
4. Verify your email if required

### Step 2: Create New Supabase Project (3 minutes)

1. Click "New Project"
2. Fill in:
   - **Name**: `deutschtagebuch`
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier
3. Click "Create new project"
4. Wait 2-3 minutes for provisioning

### Step 3: Get API Credentials (2 minutes)

1. In Supabase dashboard, click **Settings** (gear icon)
2. Click **API**
3. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
4. Keep this tab open!

### Step 4: Update Environment Variables (1 minute)

1. Open `.env` file in your project
2. Replace the placeholder values with your actual credentials:
   ```
   GEMINI_API_KEY=AIzaSyDDdAYyFrBRJ527_YnXk4dxFNgHO7N2ptI
   SUPABASE_URL=https://your-actual-project-id.supabase.co
   SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
3. Save the file

### Step 5: Run Database Schema (2 minutes)

1. In Supabase dashboard, click **SQL Editor**
2. Click **New query**
3. Open `backend/supabase-schema.sql` in your code editor
4. Copy ALL the contents
5. Paste into Supabase SQL editor
6. Click **Run** (or Cmd/Ctrl + Enter)
7. Verify success: Click **Database** → **Tables**
8. You should see 5 tables:
   - `journal_entries`
   - `vocabulary`
   - `custom_phrases`
   - `user_settings`
   - `progress_stats`

### Step 6: Install Dependencies (2 minutes)

```bash
npm install
```

This will install the Supabase client library.

### Step 7: Migrate Existing Data (Optional - 3 minutes)

**Only if you have existing data in `deutschtagebuch.db`:**

```bash
node backend/migrate-to-supabase.js
```

The script will:
- Read all data from SQLite
- Upload to Supabase
- Show progress
- Verify integrity

**If starting fresh, skip this step.**

### Step 8: Start the Server (1 minute)

```bash
npm start
```

You should see:
```
✓ Supabase client initialized
🚀 Server running on: http://localhost:3000
💾 Database: Supabase (PostgreSQL)
```

### Step 9: Test the Application (5 minutes)

1. Open **http://localhost:3000** in browser
2. Create a journal entry:
   - Write English text
   - Click "Translate"
   - Click "Process & Save"
3. Verify in Supabase dashboard:
   - Go to **Database** → **Table Editor**
   - Click `journal_entries`
   - You should see your entry!
4. Check vocabulary extraction works
5. Check progress stats update

### Step 10: Verify Everything (3 minutes)

- [ ] Journal entries save and load
- [ ] Vocabulary extraction works
- [ ] Progress stats display
- [ ] Search functionality works
- [ ] Data persists after server restart

---

## 🎉 Migration Complete!

Your app is now using Supabase instead of SQLite!

### Optional: Backup Old Database

If everything works:

```bash
mv deutschtagebuch.db deutschtagebuch.db.backup
```

Keep the backup for a few days, then delete it.

---

## 🆘 Troubleshooting

### Error: "Invalid API key"
- Check `SUPABASE_ANON_KEY` in `.env`
- No extra spaces or quotes
- Get fresh copy from Supabase dashboard

### Error: "relation does not exist"
- You didn't run the SQL schema
- Go to Step 5 and run `supabase-schema.sql`

### Error: "Cannot find module '@supabase/supabase-js'"
- Run: `npm install`

### Server won't start
- Check `.env` has correct credentials
- Verify Supabase project is active
- Check terminal for specific error

### Data not showing
- Check Supabase Table Editor
- Clear browser cache
- Check browser console (F12)

---

## 📊 What Changed?

| Before | After |
|--------|-------|
| SQLite local file | Supabase cloud PostgreSQL |
| `deutschtagebuch.db` | Supabase dashboard |
| `better-sqlite3` package | `@supabase/supabase-js` |
| Synchronous queries | Async/await queries |
| Local only | Access from anywhere |

---

## 🎯 Benefits

✅ **Cloud-hosted** - Access from anywhere
✅ **Automatic backups** - Never lose data
✅ **Better scalability** - Handles more data
✅ **Real-time ready** - For future features
✅ **No file corruption** - Database managed by Supabase

---

## 📝 Next Steps

1. Use the app for a few days
2. Verify everything works correctly
3. Delete old SQLite backup
4. Enjoy your cloud-powered app!

---

**Need help?** Check the troubleshooting section or review `SUPABASE_SETUP.md` for more details.
