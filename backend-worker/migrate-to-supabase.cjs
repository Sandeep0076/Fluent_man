require('dotenv').config();
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize SQLite database
const sqliteDb = new Database(path.join(__dirname, '..', 'deutschtagebuch.db'));

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function migrateData() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   DeutschTagebuch Data Migration           ║');
    console.log('║   SQLite → Supabase                        ║');
    console.log('╚════════════════════════════════════════════╝\n');

    try {
        // Migrate journal entries
        console.log('📝 Migrating journal entries...');
        const journalEntries = sqliteDb.prepare('SELECT * FROM journal_entries').all();

        if (journalEntries.length > 0) {
            const { data, error } = await supabase
                .from('journal_entries')
                .insert(journalEntries.map(entry => ({
                    english_text: entry.english_text,
                    german_text: entry.german_text,
                    created_at: entry.created_at,
                    word_count: entry.word_count,
                    session_duration: entry.session_duration
                })));

            if (error) throw error;
            console.log(`✓ Migrated ${journalEntries.length} journal entries`);
        } else {
            console.log('  No journal entries to migrate');
        }

        // Migrate vocabulary
        console.log('\n📚 Migrating vocabulary...');
        const vocabulary = sqliteDb.prepare('SELECT * FROM vocabulary').all();

        if (vocabulary.length > 0) {
            const { data, error } = await supabase
                .from('vocabulary')
                .insert(vocabulary.map(word => ({
                    word: word.word,
                    meaning: word.meaning,
                    first_seen: word.first_seen,
                    frequency: word.frequency,
                    last_reviewed: word.last_reviewed
                })));

            if (error) throw error;
            console.log(`✓ Migrated ${vocabulary.length} vocabulary words`);
        } else {
            console.log('  No vocabulary to migrate');
        }

        // Migrate custom phrases
        console.log('\n💬 Migrating custom phrases...');
        const phrases = sqliteDb.prepare('SELECT * FROM custom_phrases').all();

        if (phrases.length > 0) {
            const { data, error } = await supabase
                .from('custom_phrases')
                .insert(phrases.map(phrase => ({
                    english: phrase.english,
                    german: phrase.german,
                    created_at: phrase.created_at,
                    times_reviewed: phrase.times_reviewed
                })));

            if (error) throw error;
            console.log(`✓ Migrated ${phrases.length} custom phrases`);
        } else {
            console.log('  No custom phrases to migrate');
        }

        // Migrate user settings
        console.log('\n⚙️  Migrating user settings...');
        const settings = sqliteDb.prepare('SELECT * FROM user_settings LIMIT 1').get();

        if (settings) {
            // Delete default settings first
            await supabase.from('user_settings').delete().neq('id', 0);

            const { data, error } = await supabase
                .from('user_settings')
                .insert({
                    daily_goal_minutes: settings.daily_goal_minutes,
                    daily_sentence_goal: settings.daily_sentence_goal,
                    theme: settings.theme
                });

            if (error) throw error;
            console.log('✓ Migrated user settings');
        } else {
            console.log('  No user settings to migrate (using defaults)');
        }

        // Migrate progress stats
        console.log('\n📊 Migrating progress stats...');
        const progressStats = sqliteDb.prepare('SELECT * FROM progress_stats').all();

        if (progressStats.length > 0) {
            const { data, error } = await supabase
                .from('progress_stats')
                .insert(progressStats.map(stat => ({
                    date: stat.date,
                    words_learned: stat.words_learned,
                    entries_written: stat.entries_written,
                    minutes_practiced: stat.minutes_practiced
                })));

            if (error) throw error;
            console.log(`✓ Migrated ${progressStats.length} progress stat records`);
        } else {
            console.log('  No progress stats to migrate');
        }

        // Verify migration
        console.log('\n🔍 Verifying migration...');

        const { count: journalCount } = await supabase
            .from('journal_entries')
            .select('*', { count: 'exact', head: true });

        const { count: vocabCount } = await supabase
            .from('vocabulary')
            .select('*', { count: 'exact', head: true });

        const { count: phrasesCount } = await supabase
            .from('custom_phrases')
            .select('*', { count: 'exact', head: true });

        const { count: statsCount } = await supabase
            .from('progress_stats')
            .select('*', { count: 'exact', head: true });

        console.log('\n📈 Migration Summary:');
        console.log(`  Journal Entries: ${journalCount || 0}`);
        console.log(`  Vocabulary Words: ${vocabCount || 0}`);
        console.log(`  Custom Phrases: ${phrasesCount || 0}`);
        console.log(`  Progress Stats: ${statsCount || 0}`);

        console.log('\n✓ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Start your server: npm start');
        console.log('2. Test the application at http://localhost:3000');
        console.log('3. Verify your data is accessible');
        console.log('4. Backup your old database: mv deutschtagebuch.db deutschtagebuch.db.backup');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('- Check your SUPABASE_URL and SUPABASE_ANON_KEY in .env');
        console.error('- Verify you ran the supabase-schema.sql script');
        console.error('- Check Supabase dashboard for error details');
        console.error('- You can safely re-run this script after fixing issues');
        process.exit(1);
    } finally {
        sqliteDb.close();
    }
}

// Run migration
migrateData();
