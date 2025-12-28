require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function patch() {
    console.log('Applying schema patch...');
    
    // Using rpc or direct sql via supabase client is not always possible depending on setup
    // But we can try to check if the table exists by doing a query
    const { error: tableError } = await supabase.from('vocabulary_categories').select('id').limit(1);
    
    if (tableError) {
        console.log('Error detected. This usually means the table "vocabulary_categories" does not exist in your Supabase database.');
        console.log('Error details:', tableError.message);
        console.log('\nTo fix this, please run the following SQL in your Supabase SQL Editor:');
        console.log(`
-- Create Vocabulary Categories table
CREATE TABLE IF NOT EXISTS vocabulary_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to vocabulary table
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES vocabulary_categories(id) ON DELETE SET NULL;

-- Disable RLS for the new table
ALTER TABLE vocabulary_categories DISABLE ROW LEVEL SECURITY;
        `);
    } else {
        console.log('Table "vocabulary_categories" exists. Checking for "category_id" column in "vocabulary"...');
        const { error: columnError } = await supabase.from('vocabulary').select('category_id').limit(1);
        if (columnError) {
            console.log('Column "category_id" seems to be missing.');
            console.log('Please run this SQL in Supabase:');
            console.log('ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES vocabulary_categories(id) ON DELETE SET NULL;');
        } else {
            console.log('Database schema seems correct. The 500 error might be due to something else. Check server logs.');
        }
    }
}

patch();
