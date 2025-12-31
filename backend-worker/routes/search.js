import { Hono } from 'hono'
import { getSupabaseClient } from '../supabase.js'

const router = new Hono()

function extractSentencesWithTerm(text, searchTerm) {
  if (!text || !searchTerm) return [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const searchLower = searchTerm.toLowerCase();
  const matchingSentences = [];
  sentences.forEach(sentence => {
    const sentenceTrimmed = sentence.trim();
    if (sentenceTrimmed.toLowerCase().includes(searchLower)) {
      matchingSentences.push(sentenceTrimmed);
    }
  });
  return matchingSentences;
}

/**
 * GET /api/search
 */
router.get('/', async (c) => {
  try {
    const supabase = getSupabaseClient(c.env);
    const q = c.req.query('q')
    if (!q || q.trim().length === 0) {
      return c.json({ success: false, error: 'Search query is required' }, 400);
    }

    const searchTerm = q.trim();

    const { data: vocabResults, error: vocabError } = await supabase
      .from('vocabulary')
      .select('*')
      .or(`word.ilike.%${searchTerm}%,meaning.ilike.%${searchTerm}%`)
      .order('frequency', { ascending: false })
      .limit(50);

    if (vocabError) throw vocabError;

    const { data: journalResults, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .or(`english_text.ilike.%${searchTerm}%,german_text.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (journalError) throw journalError;

    // Search phrases table
    const { data: phrasesResults, error: phrasesError } = await supabase
      .from('custom_phrases')
      .select('*')
      .or(`english.ilike.%${searchTerm}%,german.ilike.%${searchTerm}%,example_english.ilike.%${searchTerm}%,example_german.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (phrasesError) throw phrasesError;

    const journalSentences = [];
    if (journalResults) {
      journalResults.forEach(entry => {
        const germanSentences = extractSentencesWithTerm(entry.german_text, searchTerm);
        germanSentences.forEach(sentence => {
          journalSentences.push({
            id: entry.id,
            sentence,
            language: 'german',
            date: entry.created_at,
            entry_id: entry.id
          });
        });

        const englishSentences = extractSentencesWithTerm(entry.english_text, searchTerm);
        englishSentences.forEach(sentence => {
          journalSentences.push({
            id: `${entry.id}-en`,
            sentence,
            language: 'english',
            date: entry.created_at,
            entry_id: entry.id
          });
        });
      });
    }

    return c.json({
      success: true,
      data: {
        vocabulary: vocabResults || [],
        journal_sentences: journalSentences,
        phrases: phrasesResults || [],
        counts: {
          vocabulary: vocabResults ? vocabResults.length : 0,
          journal_sentences: journalSentences.length,
          phrases: phrasesResults ? phrasesResults.length : 0
        }
      }
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return c.json({ success: false, error: 'Failed to perform search' }, 500);
  }
});

export default router