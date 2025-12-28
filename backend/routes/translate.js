const express = require('express');
const router = express.Router();
const { translateToGerman, translateMultipleSentences, translateToEnglish } = require('../services/translation');

/**
 * POST /api/translate
 * Translate English text to German
 */
router.post('/', async (req, res) => {
  try {
    const { text, multiSentence } = req.body;

    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid text is required for translation'
      });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text cannot be empty'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text is too long (maximum 5000 characters)'
      });
    }

    // Translate
    let translatedText;
    if (multiSentence) {
      translatedText = await translateMultipleSentences(text);
    } else {
      translatedText = await translateToGerman(text);
    }

    res.json({
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

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
});

/**
 * POST /api/translate/reverse
 * Translate German text to English (for manual vocabulary addition)
 */
router.post('/reverse', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid text is required'
      });
    }

    const translatedText = await translateToEnglish(text);

    res.json({
      success: true,
      data: {
        original: text,
        translated: translatedText,
        language: 'en'
      }
    });
  } catch (error) {
    console.error('Reverse translation error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
      details: error.message
    });
  }
});

module.exports = router;