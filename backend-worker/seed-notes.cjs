const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
    console.log('Current __dirname:', __dirname);
    console.log('Expected .env path:', path.join(__dirname, '../.env'));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const initialNotes = [
    {
        title: "The 80/20 Rule",
        content: "Don't stress about perfect grammar. 20% of the vocabulary allows you to understand 80% of daily conversation."
    },
    {
        title: "Change Language",
        content: "Change your phone's interface to German to learn practical, technical vocabulary passively."
    },
    {
        title: "Talk to Yourself",
        content: "Narrate your day. \"Ich mache jetzt Kaffee.\" It bridges the gap between thinking and speaking."
    },
    {
        title: "Media Consumption",
        content: "Watch \"Tagesschau\" in 100 seconds. Listen to podcasts. Immersion finds the rhythm."
    },
    {
        title: "The \"No English\" Hour",
        content: "For one hour, no English. If you don't know a word, describe it around the word."
    }
];

async function seedNotes() {
    console.log('🌱 Seeding initial notes...');

    try {
        const { data, error: fetchError } = await supabase
            .from('notes')
            .select('id')
            .limit(1);

        if (fetchError) {
            if (fetchError.code === '42P01') {
                console.error('❌ Table "notes" does not exist. Please run the SQL migration in Supabase first.');
                return;
            }
            throw fetchError;
        }

        if (!data || data.length === 0) {
            const { error: insertError } = await supabase
                .from('notes')
                .insert(initialNotes);

            if (insertError) throw insertError;
            console.log('✅ Successfully seeded ' + initialNotes.length + ' notes!');
        } else {
            console.log('ℹ️ Notes table already contains data. Skipping seed.');
        }
    } catch (error) {
        console.error('❌ Error seeding notes:', error.message);
    }
}

seedNotes();
