/**
 * Translate text using Google Gemini via native fetch
 * @param {string} text - The text to translate
 * @param {string} targetLang - The target language (e.g., 'German' or 'English')
 * @returns {Promise<string>} The translated text
 */
async function translateWithGeminiApi(text, targetLang = 'German', env = null) {
    const apiKey = env?.GEMINI_API_KEY || globalThis.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }

    const payload = {
        contents: [{
            parts: [{
                text: `Translate the following text to ${targetLang}. Only return the translated text without any explanation or markdown formatting: "${text}"`
            }]
        }]
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            throw new Error('Unexpected response format from Gemini API');
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

export async function translateWithGemini(text, env = null) {
    return translateWithGeminiApi(text, 'German', env);
}

export async function translateToEnglish(text, env = null) {
    return translateWithGeminiApi(text, 'English', env);
}
