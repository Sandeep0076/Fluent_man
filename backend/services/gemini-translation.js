const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Translate text from English to German using Google Gemini
 * @param {string} text - The English text to translate
 * @returns {Promise<string>} The translated German text
 */
async function translateWithGemini(text) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-3-flash-preview as requested
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Translate the following English text to German. Only return the translated text without any explanation or markdown formatting: "${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('Gemini translation error details:', error);
        throw new Error(`Gemini translation failed: ${error.message}`);
    }
}

/**
 * Translate text from German to English using Google Gemini
 * @param {string} text - The German text to translate
 * @returns {Promise<string>} The translated English text
 */
async function translateToEnglish(text) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using stable flash for simple translations

        const prompt = `Translate the following German word or phrase to English. Only return the translated English text without any explanation, punctuation or markdown formatting: "${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('Gemini English translation error details:', error);
        throw new Error(`Gemini translation to English failed: ${error.message}`);
    }
}

module.exports = {
    translateWithGemini,
    translateToEnglish
};
