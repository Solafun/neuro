// Suppress DEP0169 (url.parse) deprecation warning
const _origWarn = process.emitWarning;
process.emitWarning = (w, ...a) => {
    if (typeof w === 'string' && w.includes('DEP0169')) return;
    if (w && typeof w === 'object' && w.code === 'DEP0169') return;
    return _origWarn.call(process, w, ...a);
};

import { getAppStatus, checkUserStatus } from './lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { telegramId } = req.query;
        let isAdmin = false;

        // 1. ПРОВЕРКА АДМИНА
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
                    console.warn('Settings: DB admin check failed:', e.message);
                }
            }
        }

        console.log(`API Settings: fetching app status (user=${telegramId}, isAdmin=${isAdmin})...`);
        const status = await getAppStatus();
        console.log('API Settings result:', status);

        // Получаем данные о проверках пользователя
        let userChecks = { freeChecks: 1, paidChecks: 0, isPaid: false };
        if (telegramId) {
            try {
                const userStatus = await checkUserStatus(telegramId);
                userChecks = {
                    freeChecks: userStatus.freeChecks ?? 0,
                    paidChecks: userStatus.paidChecks ?? 0,
                    isPaid: userStatus.isPaid || false
                };
            } catch (e) {
                console.warn('Settings: user checks fetch failed:', e.message);
            }
        }

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
