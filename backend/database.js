const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, '..', 'deutschtagebuch.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Create journal_entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      english_text TEXT NOT NULL,
      german_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      word_count INTEGER DEFAULT 0,
      session_duration INTEGER DEFAULT 0
    )
  `);

  // Create vocabulary table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT UNIQUE NOT NULL,
      meaning TEXT,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      frequency INTEGER DEFAULT 1,
      last_reviewed DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create custom_phrases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      english TEXT NOT NULL,
      german TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      times_reviewed INTEGER DEFAULT 0
    )
  `);

  // Create user_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      daily_goal_minutes INTEGER DEFAULT 60,
      daily_sentence_goal INTEGER DEFAULT 10,
      theme TEXT DEFAULT 'light'
    )
  `);

  // Create progress_stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS progress_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE UNIQUE NOT NULL,
      words_learned INTEGER DEFAULT 0,
      entries_written INTEGER DEFAULT 0,
      minutes_practiced INTEGER DEFAULT 0
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
    CREATE INDEX IF NOT EXISTS idx_vocabulary_first_seen ON vocabulary(first_seen);
    CREATE INDEX IF NOT EXISTS idx_progress_date ON progress_stats(date);
  `);

  // Insert default settings if not exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM user_settings').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO user_settings (daily_goal_minutes, daily_sentence_goal, theme)
      VALUES (60, 10, 'light')
    `).run();
  }

  // Migration: Add meaning column to vocabulary table if it doesn't exist
  try {
    const columns = db.prepare('PRAGMA table_info(vocabulary)').all();
    const hasMeaning = columns.some(col => col.name === 'meaning');
    
    if (!hasMeaning) {
      console.log('⚙️  Running migration: Adding meaning column to vocabulary table...');
      db.exec('ALTER TABLE vocabulary ADD COLUMN meaning TEXT');
      console.log('✓ Migration completed successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  console.log('✓ Database initialized successfully');
}

// Initialize on module load
initializeDatabase();

module.exports = db;