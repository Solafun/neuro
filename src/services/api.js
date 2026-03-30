import axios from 'axios';

const API_BASE_URL = '/api';

export const analyzeProfile = async (nickname, telegramId = null, lang = 'ru') => {
    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, {
            nickname,
            telegramId,
            lang
        });
        return response.data;
    } catch (error) {
        console.error('Error calling production API:', error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to analyze profile');
    }
};

export const checkMaintenance = async (telegramId = null, lang = 'ru') => {
    try {
        const response = await axios.get(`${API_BASE_URL}/settings`, {
            params: { telegramId, lang }
        });
        return response.data; // { isMaintenance, maintenanceMessage, ...userChecks }
    } catch (error) {
        console.error('Error checking maintenance status:', error);
        return { isMaintenance: false };
    }
};

export const updateUserLanguage = async (telegramId, lang) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/update-language`, {
            telegramId,
            lang
        });
        return response.data;
    } catch (error) {
        console.error('Error updating user language:', error);
        return { success: false };
    }
};
