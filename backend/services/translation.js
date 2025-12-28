const axios = require('axios');
const { translateWithGemini, translateToEnglish } = require('./gemini-translation');

/**
 * Translate text between languages using MyMemory API (Fallback)
 * @param {string} text - The text to translate
 * @param {string} langpair - The language pair (e.g., 'en|de' or 'de|en')
 * @returns {Promise<string>} The translated text
 */
async function translateWithMyMemory(text, langpair = 'en|de') {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for translation');
  }

  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: text,
        langpair: langpair
      },
      timeout: 10000
    });

    if (response.data && response.data.responseData && response.data.responseData.translatedText) {
      return response.data.responseData.translatedText;
    } else {
      throw new Error('Invalid response from translation API');
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Translation request timed out. Please try again.');
    } else if (error.response) {
      throw new Error(`Translation API error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error('No response from translation API. Check your internet connection.');
    } else {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }
}

/**
 * Translate text from English to German using Gemini with MyMemory fallback
 * @param {string} text - The English text to translate
 * @returns {Promise<string>} The translated German text
 */
async function translateToGerman(text) {
  try {
    return await translateWithGemini(text);
  } catch (error) {
    console.warn(`[Translation] Gemini (EN->DE) failed, falling back to MyMemory. Error: ${error.message}`);
    return await translateWithMyMemory(text, 'en|de');
  }
}

/**
 * Translate text from German to English using Gemini with MyMemory fallback
 * @param {string} text - The German word or phrase to translate
 * @returns {Promise<string>} The translated English text
 */
async function translateToEnglishWithFallback(text) {
  try {
    return await translateToEnglish(text);
  } catch (error) {
    console.warn(`[Translation] Gemini (DE->EN) failed, falling back to MyMemory. Error: ${error.message}`);
    return await translateWithMyMemory(text, 'de|en');
  }
}

/**
 * Translate multiple sentences (split by newlines or periods)
 * @param {string} text - The English text with multiple sentences
 * @returns {Promise<string>} The translated German text
 */
async function translateMultipleSentences(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for translation');
  }

  // Split by newlines and periods, but keep the delimiters
  const sentences = text.split(/(\n|\.(?:\s|$))/).filter(s => s.trim().length > 0);
  const translations = [];

  for (const sentence of sentences) {
    // Skip delimiters
    if (sentence === '\n' || sentence.match(/^\.(\s|$)/)) {
      translations.push(sentence);
      continue;
    }

    try {
      const translated = await translateToGerman(sentence.trim());
      translations.push(translated);

      // Add a small delay to avoid rate limiting (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error translating sentence: ${sentence}`, error.message);
      // If translation fails, keep original text
      translations.push(sentence);
    }
  }

  return translations.join(' ').trim();
}

module.exports = {
  translateToGerman,
  translateMultipleSentences,
  translateToEnglish: translateToEnglishWithFallback,
  translateWithMyMemory
};