require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function setupJourneyMap() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   DeutschTagebuch Journey Map Setup        ║');
    console.log('║   30-Day Gamified Learning Journey         ║');
    console.log('╚════════════════════════════════════════════╝\n');

    try {
        // Read the SQL schema file
        console.log('📖 Reading journey-schema.sql...');
        const schemaPath = path.join(__dirname, 'journey-schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error('journey-schema.sql not found! Make sure the file exists in backend-worker/');
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('✓ Schema file loaded successfully\n');

        // Execute the schema SQL
        console.log('🗄️  Creating journey map tables...');
        console.log('   - journey_progress');
        console.log('   - daily_activities');
        console.log('   - achievements');
        console.log('   - journey_landmarks\n');

        const { error: schemaError } = await supabase.rpc('exec_sql', { 
            sql: schemaSql 
        }).catch(() => {
            // If RPC doesn't exist, try direct execution
            // Note: Supabase doesn't allow direct SQL execution via JS client
            // The user needs to run this in Supabase SQL Editor
            return { error: { message: 'Direct SQL execution not available via client' } };
        });

        // Since Supabase JS client doesn't support raw SQL execution,
        // we need to inform the user to run it in the SQL editor
        console.log('⚠️  Note: The Supabase JavaScript client does not support raw SQL execution.');
        console.log('   Please run journey-schema.sql in the Supabase SQL Editor:\n');
        console.log('   1. Go to https://supabase.com/dashboard');
        console.log('   2. Select your project');
        console.log('   3. Navigate to SQL Editor');
        console.log('   4. Copy and paste the contents of backend-worker/journey-schema.sql');
        console.log('   5. Click "Run"\n');

        // Verify tables exist by checking if we can query them
        console.log('🔍 Verifying journey map tables...\n');

        const tables = [
            'journey_progress',
            'daily_activities',
            'achievements',
            'journey_landmarks'
        ];

        let allTablesExist = true;

        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.log(`   ❌ ${table}: Not found or not accessible`);
                    allTablesExist = false;
                } else {
                    console.log(`   ✓ ${table}: ${count || 0} records`);
                }
            } catch (err) {
                console.log(`   ❌ ${table}: Error checking table`);
                allTablesExist = false;
            }
        }

        if (!allTablesExist) {
            console.log('\n⚠️  Some tables are missing. Please run journey-schema.sql in Supabase SQL Editor.\n');
            console.log('📋 Setup Instructions:');
            console.log('   1. Open Supabase dashboard: https://supabase.com/dashboard');
            console.log('   2. Go to SQL Editor');
            console.log('   3. Run the journey-schema.sql file');
            console.log('   4. Come back and run this script again\n');
            process.exit(1);
        }

        // Check if journey is already initialized
        console.log('\n🏴‍☠️ Checking journey initialization...');
        const { data: existingJourney, error: journeyCheckError } = await supabase
            .from('journey_progress')
            .select('*')
            .eq('user_id', 1)
            .single();

        if (existingJourney) {
            console.log('✓ Journey already initialized for user');
            console.log(`  Current Day: ${existingJourney.current_day}/30`);
            console.log(`  Completed Days: ${existingJourney.completed_days?.length || 0}`);
            console.log(`  Start Date: ${existingJourney.journey_start_date}`);
        } else {
            console.log('  Journey not found, creating initial journey...');
            const { error: initError } = await supabase
                .from('journey_progress')
                .insert({
                    user_id: 1,
                    journey_start_date: new Date().toISOString().split('T')[0],
                    current_day: 1,
                    completed_days: []
                });

            if (initError) {
                console.log('  ⚠️  Could not create journey (may already exist)');
            } else {
                console.log('  ✓ Journey initialized successfully');
            }
        }

        // Verify landmarks
        console.log('\n🏝️  Checking landmarks...');
        const { data: landmarks, error: landmarksError } = await supabase
            .from('journey_landmarks')
            .select('name, day_number')
            .order('day_number');

        if (landmarks && landmarks.length > 0) {
            console.log(`✓ ${landmarks.length} landmarks configured:`);
            landmarks.forEach(landmark => {
                console.log(`  - Day ${landmark.day_number}: ${landmark.name}`);
            });
        } else {
            console.log('  ⚠️  No landmarks found');
        }

        // Verify achievements
        console.log('\n🏆 Checking achievements...');
        const { data: achievements, error: achievementsError } = await supabase
            .from('achievements')
            .select('title, category')
            .order('created_at');

        if (achievements && achievements.length > 0) {
            console.log(`✓ ${achievements.length} achievements available:`);
            const milestones = achievements.filter(a => a.category === 'milestone');
            const special = achievements.filter(a => a.category === 'special');
            console.log(`  - ${milestones.length} milestone achievements`);
            console.log(`  - ${special.length} special achievements`);
        } else {
            console.log('  ⚠️  No achievements found');
        }

        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║   ✓ Journey Map Setup Complete!            ║');
        console.log('╚════════════════════════════════════════════╝\n');

        console.log('📋 Next Steps:');
        console.log('1. Start the application: npm run dev');
        console.log('2. Open http://localhost:6000 in your browser');
        console.log('3. Navigate to the Dashboard to see your Journey Map');
        console.log('4. Complete daily activities to progress on your journey');
        console.log('5. Unlock achievements at milestone days (7, 14, 21, 30)\n');

        console.log('📚 For testing instructions, see JOURNEY_MAP_TESTING.md\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('- Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
        console.error('- Ensure you have run supabase-schema.sql first');
        console.error('- Run journey-schema.sql in Supabase SQL Editor');
        console.error('- Check Supabase dashboard for error details');
        console.error('- You can safely re-run this script after fixing issues\n');
        process.exit(1);
    }
}

// Run setup
setupJourneyMap();