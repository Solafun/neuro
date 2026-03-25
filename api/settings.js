import { getMaintenanceMode } from './lib/supabase';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('API Settings: fetching maintenance mode...');
        const isMaintenance = await getMaintenanceMode();
        console.log('API Settings: result:', isMaintenance);
        return res.status(200).json({ isMaintenance });
    } catch (error) {
        console.error('API Settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
