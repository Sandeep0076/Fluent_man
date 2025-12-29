// Test script to verify search functionality
// Run with: node backend/test-search.js

const supabase = require('./supabase');

async function testSearch() {
  console.log('=== Testing Search Functionality ===\n');

  const searchTerm = 'reg';
  console.log(`Searching for: "${searchTerm}"\n`);

  try {
    // Test 1: Check if we can query journal entries at all
    console.log('Test 1: Fetching all journal entries...');
    const { data: allEntries, error: allError } = await supabase
      .from('journal_entries')
      .select('id, english_text, german_text')
      .limit(5);

    if (allError) {
      console.error('Error fetching entries:', allError);
      return;
    }

    console.log(`Found ${allEntries?.length || 0} total entries`);
    if (allEntries && allEntries.length > 0) {
      allEntries.forEach(entry => {
        console.log(`\nEntry ${entry.id}:`);
        console.log(`  English: ${entry.english_text?.substring(0, 100)}...`);
        console.log(`  German: ${entry.german_text?.substring(0, 100)}...`);
      });
    }

    // Test 2: Search with OR condition
    console.log('\n\nTest 2: Searching with OR condition...');
    const { data: searchResults, error: searchError } = await supabase
      .from('journal_entries')
      .select('*')
      .or(`english_text.ilike.%${searchTerm}%,german_text.ilike.%${searchTerm}%`)
      .limit(10);

    if (searchError) {
      console.error('Search error:', searchError);
      return;
    }

    console.log(`Found ${searchResults?.length || 0} entries matching "${searchTerm}"`);
    
    if (searchResults && searchResults.length > 0) {
      searchResults.forEach(entry => {
        const englishMatch = entry.english_text?.toLowerCase().includes(searchTerm.toLowerCase());
        const germanMatch = entry.german_text?.toLowerCase().includes(searchTerm.toLowerCase());
        
        console.log(`\nEntry ${entry.id}:`);
        console.log(`  English match: ${englishMatch}`);
        console.log(`  German match: ${germanMatch}`);
        
        if (englishMatch) {
          console.log(`  English text: ${entry.english_text?.substring(0, 150)}...`);
        }
        if (germanMatch) {
          console.log(`  German text: ${entry.german_text?.substring(0, 150)}...`);
        }
      });
    }

    // Test 3: Search English only
    console.log('\n\nTest 3: Searching English text only...');
    const { data: englishOnly, error: enError } = await supabase
      .from('journal_entries')
      .select('*')
      .ilike('english_text', `%${searchTerm}%`)
      .limit(10);

    if (enError) {
      console.error('English search error:', enError);
    } else {
      console.log(`Found ${englishOnly?.length || 0} entries with "${searchTerm}" in English text`);
    }

    // Test 4: Search German only
    console.log('\n\nTest 4: Searching German text only...');
    const { data: germanOnly, error: deError } = await supabase
      .from('journal_entries')
      .select('*')
      .ilike('german_text', `%${searchTerm}%`)
      .limit(10);

    if (deError) {
      console.error('German search error:', deError);
    } else {
      console.log(`Found ${germanOnly?.length || 0} entries with "${searchTerm}" in German text`);
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSearch();