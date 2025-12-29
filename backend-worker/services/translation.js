import { translateWithGemini, translateToEnglish } from './gemini-translation.js';

/**
 * Translate text between languages using MyMemory API (Fallback)
 * @param {string} text - The text to translate
 * @param {string} langpair - The language pair (e.g., 'en|de' or 'de|en')
 * @returns {Promise<string>} The translated text
 */
export async function translateWithMyMemory(text, langpair = 'en|de') {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for translation');
  }

  try {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.append('q', text);
    url.searchParams.append('langpair', langpair);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    } else {
      throw new Error('Invalid response from translation API');
    }
  } catch (error) {
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Translate text from English to German using Gemini with MyMemory fallback
 * @param {string} text - The English text to translate
 * @param {object} env - The environment object containing API keys
 * @returns {Promise<string>} The translated German text
 */
export async function translateToGerman(text, env = null) {
  try {
    return await translateWithGemini(text, env);
  } catch (error) {
    console.warn(`[Translation] Gemini (EN->DE) failed, falling back to MyMemory. Error: ${error.message}`);
    return await translateWithMyMemory(text, 'en|de');
  }
}

/**
 * Translate text from German to English using Gemini with MyMemory fallback
 * @param {string} text - The German word or phrase to translate
 * @param {object} env - The environment object containing API keys
 * @returns {Promise<string>} The translated English text
 */
export async function translateToEnglishWithFallback(text, env = null) {
  try {
    return await translateToEnglish(text, env);
  } catch (error) {
    console.warn(`[Translation] Gemini (DE->EN) failed, falling back to MyMemory. Error: ${error.message}`);
    return await translateWithMyMemory(text, 'de|en');
  }
}

/**
 * Translate multiple sentences (split by newlines or periods)
 * @param {string} text - The English text with multiple sentences
 * @param {object} env - The environment object containing API keys
 * @returns {Promise<string>} The translated German text
 */
export async function translateMultipleSentences(text, env = null) {
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
      const translated = await translateToGerman(sentence.trim(), env);
      translations.push(translated);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error translating sentence: ${sentence}`, error.message);
      translations.push(sentence);
    }
  }

  return translations.join(' ').trim();
}

export { translateToEnglishWithFallback as translateToEnglish };