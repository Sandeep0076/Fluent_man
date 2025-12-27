require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Error: Missing Supabase credentials in .env file');
    console.error('Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file');
    console.error('See SUPABASE_SETUP.md for instructions');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false // We're not using auth yet
        }
    }
);

console.log('✓ Supabase client initialized');

module.exports = supabase;
