import { getAppStatus, trackUser } from './lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { user, lang = 'ru' } = req.body;
        const telegramId = user?.id;
        let isAdmin = false;

        // 1. ПРОВЕРКА АДМИНА И ДАННЫХ ПРОВЕРОК
        let userChecks = { freeChecks: 1, paidChecks: 0, isPaid: false };
        if (telegramId) {
            let userRow = null;
            try {
                // Активно регистрируем/обновляем пользователя при каждом входе в настройки
                userRow = await trackUser(user);
            } catch (e) {
                console.warn('Settings: user track failed:', e.message);
            }

            // Check ENV Admin
            if (process.env.ADMIN_TELEGRAM_ID && String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID)) {
                isAdmin = true;
            } else if (userRow?.is_admin) {
                isAdmin = true;
            }

            // Populate userChecks
            if (userRow) {
                userChecks = {
                    freeChecks: userRow.free_checks_remaining ?? 0,
                    paidChecks: userRow.paid_checks_remaining ?? 0,
                    isPaid: userRow.is_paid || false
                };
            }
        }

        const status = await getAppStatus();

        // Если админ — принудительно отключаем флаг техработ для этого запроса
        const isMaintenance = isAdmin ? false : (status?.is_maintenance || false);

        const defaultMaintenanceMsg = lang === 'ru'
            ? 'Технические работы'
            : 'Technical Works';

        return res.status(200).json({
            isMaintenance: isMaintenance,
            maintenanceMessage: status?.maintenance_message || defaultMaintenanceMsg,
            ...userChecks
        });
    } catch (error) {
        console.error('API Settings error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
