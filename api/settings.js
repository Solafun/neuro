import { getAppStatus, checkUserStatus } from './lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { telegramId } = req.query;
        let isAdmin = false;

        // 1. ПРОВЕРКА АДМИНА И ДАННЫХ ПРОВЕРОК
        let userChecks = { freeChecks: 1, paidChecks: 0, isPaid: false };
        if (telegramId) {
            let userStatus = null;
            try {
                userStatus = await checkUserStatus(telegramId);
            } catch (e) {
                console.warn('Settings: user status fetch failed:', e.message);
            }

            // Check ENV Admin
            if (process.env.ADMIN_TELEGRAM_ID && String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID)) {
                isAdmin = true;
            } else if (userStatus?.isAdmin) {
                isAdmin = true;
            }

            // Populate userChecks
            if (userStatus) {
                userChecks = {
                    freeChecks: userStatus.freeChecks ?? 0,
                    paidChecks: userStatus.paidChecks ?? 0,
                    isPaid: userStatus.isPaid || false
                };
            }
        }

        console.log(`API Settings: fetching app status (user=${telegramId}, isAdmin=${isAdmin})...`);
        const status = await getAppStatus();
        console.log('API Settings result:', status);

        // Если админ — принудительно отключаем флаг техработ для этого запроса
        const isMaintenance = isAdmin ? false : (status?.is_maintenance || false);

        return res.status(200).json({
            isMaintenance: isMaintenance,
            maintenanceMessage: status?.maintenance_message || 'Технические работы',
            ...userChecks
        });
    } catch (error) {
        console.error('API Settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
