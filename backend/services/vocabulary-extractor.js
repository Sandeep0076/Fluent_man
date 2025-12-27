const supabase = require('../supabase');
const { translateToGerman } = require('./translation');

// Common German stop words to filter out
const STOP_WORDS = new Set([
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'und', 'aber', 'oder',
  'denn', 'ist', 'bin', 'sind', 'war', 'waren', 'das', 'der', 'die',
  'den', 'dem', 'des', 'eine', 'ein', 'einer', 'eines', 'einem', 'einen',
  'zu', 'in', 'im', 'auf', 'mit', 'von', 'für', 'an', 'bei', 'nach',
  'aus', 'um', 'über', 'unter', 'durch', 'vor', 'hinter', 'neben',
  'zwischen', 'nicht', 'auch', 'nur', 'noch', 'schon', 'sehr', 'so',
  'wie', 'was', 'wer', 'wo', 'wann', 'warum', 'haben', 'hat', 'hatte',
  'hatten', 'sein', 'wird', 'werden', 'wurde', 'wurden', 'kann', 'könnte',
  'muss', 'soll', 'will', 'mag', 'darf', 'möchte', 'würde', 'sollte'
]);

/**
 * Extract vocabulary from German text
 * @param {string} germanText - The German text to extract words from
 * @returns {Promise<Array>} Array of new words added
 */
async function extractVocabulary(germanText) {
  if (!germanText || typeof germanText !== 'string') {
    return [];
  }

  // Remove punctuation and split into words
  const rawWords = germanText
    .replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()„""‚''»«›‹?]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  const newWords = [];
  const today = new Date().toISOString();

  // Process each word
  for (const word of rawWords) {
    const cleanWord = word.trim();
    const lowerWord = cleanWord.toLowerCase();

    // Skip if too short or is a stop word
    if (cleanWord.length <= 3 || STOP_WORDS.has(lowerWord)) {
      continue;
    }

    try {
      // Check if word already exists
      const { data: existing, error: fetchError } = await supabase
        .from('vocabulary')
        .select('id, frequency')
        .ilike('word', cleanWord)
        .single();

      if (existing) {
        // Update frequency and last_reviewed
        await supabase
          .from('vocabulary')
          .update({
            frequency: existing.frequency + 1,
            last_reviewed: today
          })
          .eq('id', existing.id);
      } else {
        // Try to get meaning for new words (but don't block if it fails)
        let meaning = null;
        try {
          meaning = await translateToGerman(cleanWord);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to get meaning for "${cleanWord}":`, error.message);
          // Continue without meaning if translation fails
        }

        // Insert new word with meaning
        const { data: newWord, error } = await supabase
          .from('vocabulary')
          .insert({
            word: cleanWord,
            meaning: meaning,
            first_seen: today,
            frequency: 1,
            last_reviewed: today
          })
          .select()
          .single();

        if (!error && newWord) {
          newWords.push({
            id: newWord.id,
            word: cleanWord,
            meaning: meaning,
            first_seen: today
          });
        }
      }
    } catch (error) {
      console.error(`Error processing word "${cleanWord}":`, error.message);
    }
  }

  return newWords;
}

/**
 * Get vocabulary statistics
 * @returns {Promise<Object>} Statistics about vocabulary
 */
async function getVocabularyStats() {
  // Total vocabulary
  const { count: total, error: totalError } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true });

  if (totalError) throw totalError;

  // This week
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: thisWeek, error: weekError } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })
    .gte('first_seen', sevenDaysAgo.toISOString());

  if (weekError) throw weekError;

  // This month
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: thisMonth, error: monthError } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })
    .gte('first_seen', thirtyDaysAgo.toISOString());

  if (monthError) throw monthError;

  // Average per week (calculate from all vocabulary)
  const { data: allVocab, error: allError } = await supabase
    .from('vocabulary')
    .select('first_seen')
    .order('first_seen', { ascending: true });

  if (allError) throw allError;

  let averagePerWeek = 0;
  if (allVocab && allVocab.length > 0) {
    const firstDate = new Date(allVocab[0].first_seen);
    const now = new Date();
    const weeksSinceStart = Math.max(1, (now - firstDate) / (1000 * 60 * 60 * 24 * 7));
    averagePerWeek = Math.round(allVocab.length / weeksSinceStart);
  }

  return {
    total: total || 0,
    thisWeek: thisWeek || 0,
    thisMonth: thisMonth || 0,
    averagePerWeek
  };
}

module.exports = {
  extractVocabulary,
  getVocabularyStats
};