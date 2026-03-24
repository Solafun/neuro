import axios from 'axios';

const API_BASE_URL = '/api';

export const analyzeProfile = async (nickname, telegramId = null) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/analyze`, {
            nickname,
            telegramId
        });
        return response.data;
    } catch (error) {
        console.error('Error calling production API:', error);
        throw new Error(error.response?.data?.message || error.message || 'Failed to analyze profile');
    }
};
