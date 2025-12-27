# Supabase Setup Guide - Step by Step

This guide will walk you through migrating your DeutschTagebuch app from SQLite to Supabase.

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign Up"
3. Sign up with GitHub, Google, or email
4. Verify your email if required

## Step 2: Create a New Project

1. Once logged in, click "New Project"
2. Fill in the project details:
   - **Name**: `deutschtagebuch` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient
3. Click "Create new project"
4. Wait 2-3 minutes for project to be provisioned

## Step 3: Get Your API Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear icon) in the left sidebar
2. Click on **API** under Project Settings
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`
4. **Keep this tab open** - you'll need these values in the next step

## Step 4: Set Up Database Schema

1. In Supabase dashboard, click on **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy the entire contents of `backend/supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" message
7. Verify tables were created:
   - Click **Database** → **Tables** in left sidebar
   - You should see 5 tables: `journal_entries`, `vocabulary`, `custom_phrases`, `user_settings`, `progress_stats`

## Step 5: Configure Environment Variables

1. Open your `.env` file in the project root
2. Add these two lines (replace with your actual values from Step 3):
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Your `.env` file should now look like:
   ```
   GEMINI_API_KEY=AIzaSyDDdAYyFrBRJ527_YnXk4dxFNgHO7N2ptI
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Save the file

## Step 6: Install Supabase Client

1. Open terminal in your project directory
2. Run:
   ```bash
   npm install @supabase/supabase-js
   ```
3. Wait for installation to complete

## Step 7: Migrate Existing Data (Optional)

**Only do this if you have existing data in `deutschtagebuch.db` that you want to keep.**

1. Make sure your `.env` file is configured (Step 5)
2. Run the migration script:
   ```bash
   node backend/migrate-to-supabase.js
   ```
3. The script will:
   - Read all data from SQLite database
   - Upload it to Supabase
   - Show progress for each table
   - Verify data integrity
4. Wait for "✓ Migration completed successfully!" message

**If you don't have existing data or want to start fresh, skip this step.**

## Step 8: Start the Server

1. Start your server:
   ```bash
   npm start
   ```
2. You should see:
   ```
   ✓ Supabase client initialized
   🚀 Server running on: http://localhost:3000
   💾 Database: Supabase (PostgreSQL)
   ```
3. If you see any errors, check that:
   - Your `.env` file has correct credentials
   - You ran the schema SQL script (Step 4)
   - You installed the Supabase client (Step 6)

## Step 9: Verify Everything Works

1. Open your browser to `http://localhost:3000`
2. Try creating a journal entry:
   - Write some English text
   - Click "Translate"
   - Click "Process & Save"
3. Check that:
   - Entry appears in the history
   - Vocabulary words are extracted
   - Progress stats update
4. Verify in Supabase dashboard:
   - Go to **Database** → **Table Editor**
   - Click on `journal_entries` table
   - You should see your entry

## Step 10: Backup Your Old Database (Optional)

If migration was successful and everything works:

1. Rename your old SQLite database:
   ```bash
   mv deutschtagebuch.db deutschtagebuch.db.backup
   ```
2. Keep it as a backup for a few days
3. Delete it once you're confident everything works

---

## Troubleshooting

### Error: "Invalid API key"
- Double-check your `SUPABASE_ANON_KEY` in `.env`
- Make sure there are no extra spaces or quotes
- Get a fresh copy from Supabase dashboard → Settings → API

### Error: "relation does not exist"
- You didn't run the schema SQL script
- Go back to Step 4 and run `supabase-schema.sql`

### Error: "Cannot find module '@supabase/supabase-js'"
- You didn't install the Supabase client
- Run: `npm install @supabase/supabase-js`

### Migration script fails
- Check that your SQLite database file exists: `deutschtagebuch.db`
- Verify Supabase credentials are correct
- Check Supabase dashboard for any error messages
- Try running the script again (it's safe to re-run)

### Data not showing up
- Check Supabase dashboard → Table Editor to see if data is there
- Clear browser cache and reload
- Check browser console for errors (F12)
- Verify server is running without errors

---

## What Changed?

- **Before**: Data stored in local `deutschtagebuch.db` file (SQLite)
- **After**: Data stored in Supabase cloud database (PostgreSQL)

**Benefits:**
- ✅ Access your data from anywhere
- ✅ Automatic backups
- ✅ Better scalability
- ✅ Real-time capabilities (for future features)
- ✅ No more database file corruption issues

---

## Need Help?

1. Check the error message carefully
2. Review the troubleshooting section above
3. Verify each step was completed correctly
4. Check Supabase dashboard for any issues with your project
