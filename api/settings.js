import { getAppStatus } from './lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('API Settings: fetching app status...');
        const status = await getAppStatus();
        console.log('API Settings result:', status);
        return res.status(200).json({
            isMaintenance: status?.is_maintenance || false,
            maintenanceMessage: status?.maintenance_message || 'Технические работы'
        });
    } catch (error) {
        console.error('API Settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
