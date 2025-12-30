/**
 * Seed script to populate database with built-in German phrases
 * Run this once to migrate built-in phrases to the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const BUILT_IN_PHRASES = [
  {
    category: "Phrases",
    phrase: "Meiner Meinung nach...",
    meaning: "In my opinion...",
    example_german: "Meiner Meinung nach ist das eine sehr gute Idee.",
    example_english: "In my opinion, that is a very good idea.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Das kommt darauf an.",
    meaning: "That depends.",
    example_german: "Gehen wir heute spazieren? Das kommt auf das Wetter an.",
    example_english: "Are we going for a walk today? That depends on the weather.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Ich hätte gern...",
    meaning: "I would like to have...",
    example_german: "Ich hätte gern ein Glas Wasser, bitte.",
    example_english: "I would like to have a glass of water, please.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Ehrlich gesagt...",
    meaning: "To be honest...",
    example_german: "Ehrlich gesagt habe ich heute keine Lust auf Kino.",
    example_english: "To be honest, I don't feel like going to the cinema today.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Keine Ahnung!",
    meaning: "No idea!",
    example_german: "Weißt du, wo mein Handy ist? Keine Ahnung!",
    example_english: "Do you know where my phone is? No idea!",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Das macht nichts.",
    meaning: "It doesn't matter / No problem.",
    example_german: "Entschuldigung für die Verspätung! Das macht nichts.",
    example_english: "Sorry for the delay! It doesn't matter.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Wie bitte?",
    meaning: "Pardon? / What did you say?",
    example_german: "Wie bitte? Könnten Sie das noch einmal wiederholen?",
    example_english: "Pardon? Could you repeat that once more?",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Schönen Feierabend!",
    meaning: "Have a nice evening (after work)!",
    example_german: "Ich gehe jetzt nach Hause. Schönen Feierabend!",
    example_english: "I'm going home now. Have a nice evening!",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Vielen Dank im Voraus.",
    meaning: "Many thanks in advance.",
    example_german: "Könnten Sie mir die Informationen schicken? Vielen Dank im Voraus.",
    example_english: "Could you send me the information? Many thanks in advance.",
    builtin: true
  },
  {
    category: "Phrases",
    phrase: "Es tut mir leid, dass...",
    meaning: "I am sorry that...",
    example_german: "Es tut mir leid, dass ich dich so lange warten ließ.",
    example_english: "I am sorry that I kept you waiting for so long.",
    builtin: true
  }
];

async function seedBuiltInPhrases() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .dev.vars');
    console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🌱 Starting to seed built-in phrases...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const phrase of BUILT_IN_PHRASES) {
    try {
      // Check if phrase already exists
      const { data: existing } = await supabase
        .from('custom_phrases')
        .select('id, german, english')
        .or(`german.ilike.${phrase.phrase},english.ilike.${phrase.meaning}`)
        .single();

      if (existing) {
        console.log(`⏭️  Skipped (already exists): "${phrase.phrase}"`);
        skipCount++;
        continue;
      }

      // Insert the phrase
      const { data, error } = await supabase
        .from('custom_phrases')
        .insert({
          english: phrase.meaning,
          german: phrase.phrase,
          meaning: phrase.meaning,
          example_english: phrase.example_english,
          example_german: phrase.example_german,
          times_reviewed: 0,
          category_id: null
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Added: "${phrase.phrase}" → "${phrase.meaning}"`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error adding "${phrase.phrase}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${BUILT_IN_PHRASES.length}`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Built-in phrases seeded successfully!');
  } else {
    console.log('\n⚠️  Seeding completed with some errors.');
  }
}

// Run the seed function
seedBuiltInPhrases()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });