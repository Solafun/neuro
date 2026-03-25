import { syncAllUserChecks, checkUserStatus } from './lib/supabase.js';

export default async function handler(req, res) {
    // Only allow GET requests for simplicity in calling from browser
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { secret, telegramId } = req.query;

        // Simple security: check if telegramId is an admin
        let isAdmin = false;
        if (telegramId) {
            // Check ENV Admin
            if (process.env.ADMIN_TELEGRAM_ID && String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID)) {
                isAdmin = true;
            }

            // Check DB Admin if not ENV admin
            if (!isAdmin) {
                try {
                    const status = await checkUserStatus(telegramId);
                    if (status.isAdmin) isAdmin = true;
                } catch (e) {
                    console.warn('Sync: DB admin check failed:', e.message);
                }
            }
        }

        // Alternative: use a simple secret from env if provided
        const masterSecret = process.env.SYNC_SECRET || 'sync_master_2024';
        if (!isAdmin && secret !== masterSecret) {
            return res.status(403).json({ error: 'Forbidden: Admin access or valid secret required' });
        }

        console.log('API Sync: starting checks synchronization...');
        const result = await syncAllUserChecks();

        if (result.success) {
            return res.status(200).json({
                message: 'Synchronization successful',
                updatedUsers: result.updatedCount
            });
        } else {
            return res.status(500).json({
                error: 'Synchronization failed',
                details: result.error
            });
        }
    } catch (error) {
        console.error('API Sync error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
