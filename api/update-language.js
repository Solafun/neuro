import { updateUserLanguage } from './lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { telegramId, lang } = req.body;

        if (!telegramId || !lang) {
            return res.status(400).json({ error: 'Missing required fields: telegramId, lang' });
        }

        const data = await updateUserLanguage(telegramId, lang);

        if (!data) {
            return res.status(500).json({ error: 'Failed to update language in database' });
        }

        return res.status(200).json({ success: true, language: lang });
    } catch (error) {
        console.error('API Update Language error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
