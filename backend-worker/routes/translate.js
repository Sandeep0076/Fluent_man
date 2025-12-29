import { Hono } from 'hono'
import { translateToGerman, translateMultipleSentences, translateToEnglish } from '../services/translation.js'

const router = new Hono()

/**
 * POST /api/translate
 * Translate English text to German
 */
router.post('/', async (c) => {
  try {
    const { text, multiSentence } = await c.req.json();

    // Validation
    if (!text || typeof text !== 'string') {
      return c.json({
        success: false,
        error: 'Valid text is required for translation'
      }, 400);
    }

    if (text.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Text cannot be empty'
      }, 400);
    }

    if (text.length > 5000) {
      return c.json({
        success: false,
        error: 'Text is too long (maximum 5000 characters)'
      }, 400);
    }

    // Translate
    let translatedText;
    if (multiSentence) {
      translatedText = await translateMultipleSentences(text, c.env);
    } else {
      translatedText = await translateToGerman(text, c.env);
    }

    return c.json({
      success: true,
      data: {
        original: text,
        translated: translatedText,
        language: 'de'
      }
    });
  } catch (error) {
    console.error('Translation error:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Translation failed';
    if (error.message.includes('timeout')) {
      errorMessage = 'Translation request timed out. Please try again.';
    } else if (error.message.includes('internet') || error.message.includes('connection')) {
      errorMessage = 'No internet connection. Please check your network.';
    } else if (error.message.includes('API error')) {
      errorMessage = 'Translation service is temporarily unavailable.';
    }

    return c.json({
      success: false,
      error: errorMessage,
      details: error.message
    }, 500);
  }
});

/**
 * POST /api/translate/reverse
 * Translate German text to English (for manual vocabulary addition)
 */
router.post('/reverse', async (c) => {
  try {
    const { text } = await c.req.json();

    if (!text || typeof text !== 'string') {
      return c.json({
        success: false,
        error: 'Valid text is required'
      }, 400);
    }

    const translatedText = await translateToEnglish(text, c.env);

    return c.json({
      success: true,
      data: {
        original: text,
        translated: translatedText,
        language: 'en'
      }
    });
  } catch (error) {
    console.error('Reverse translation error:', error);
    return c.json({
      success: false,
      error: 'Translation failed',
      details: error.message
    }, 500);
  }
});

export default router