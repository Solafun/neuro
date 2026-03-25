import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Инициализируем только если данные есть
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

/**
 * Записывает пользователя (если новый) с расширенными данными
 */
export async function trackUser(telegramUser) {
    if (!supabase || !telegramUser) return;

    const { id, username, first_name, last_name, language_code, is_premium } = telegramUser;
    console.log(`Tracking user: ${id} (${username})`);

    const { error } = await supabase.from('users').upsert({
        id: id,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        language_code: language_code || null,
        is_premium: is_premium || false,
        last_seen: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
        console.error('Supabase trackUser error:', error.message, error.details);
    }
}


/**
 * Продление подписки
 */
export async function updateSubscription(userId, type, days) {
    if (!supabase) return;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);

    await supabase.from('users').update({
        is_paid: true,
        subscription_type: type,
        subscription_expires_at: expiry.toISOString()
    }).eq('id', userId);
}


/**
 * Записывает факт проверки профиля
 */
export async function trackCheck(telegramId, targetNickname) {
    if (!supabase) return;
    console.log(`Logging check: ${targetNickname} by user ${telegramId}`);

    // ОПЦИОНАЛЬНО: Пытаемся создать "скелет" пользователя, если его нет в базе, 
    // чтобы не нарушать констреинт Foreign Key
    if (telegramId) {
        const { error: upsertError } = await supabase.from('users').upsert(
            { id: telegramId },
            { onConflict: 'id' }
        );
        if (upsertError) {
            console.warn(`Non-critical: Could not auto-register user ${telegramId}:`, upsertError.message);
        }
    }

    const { error } = await supabase.from('checks').insert({
        user_id: telegramId || null,
        target_nickname: targetNickname,
        created_at: new Date().toISOString()
    });

    if (error) {
        console.error('Supabase trackCheck error:', error.message, error.details);
    }
}

/**
 * Установка статуса подписки через канал
 */
export async function setChannelSubscription(userId, isActive) {
    if (!supabase) return;

    await supabase.from('users').update({
        is_paid: isActive,
        subscription_type: isActive ? 'channel' : 'free',
        // Если активен, убираем дату истечения (пока он в канале)
        subscription_expires_at: null
    }).eq('id', userId);
}

/**
 * Получение статуса пользователя (оплачено или нет)
 */
export async function checkUserStatus(telegramId) {
    if (!supabase || !telegramId) return { isPaid: false };
    try {
        const { data, error } = await supabase
            .from('users')
            .select('is_paid, subscription_expires_at, is_admin')
            .eq('id', telegramId)
            .single();

        if (error || !data) return { isPaid: false, isAdmin: false };

        // Если оплачено, проверяем дату окончания
        if (data.is_paid && data.subscription_expires_at) {
            const now = new Date();
            const expires = new Date(data.subscription_expires_at);
            if (expires < now) {
                console.log(`Subscription expired for user ${telegramId}, auto-revoking.`);
                await setUserPaidStatus(telegramId, false, null);
                return { isPaid: false, isAdmin: !!data.is_admin };
            }
        }

        return { isPaid: !!data.is_paid, isAdmin: !!data.is_admin };
    } catch (e) {
        console.error('Error in checkUserStatus:', e);
        return { isPaid: false };
    }
}

/**
 * Установка статуса оплаты пользователя
 * @param {number} telegramId - ID пользователя
 * @param {boolean} isPaid - Статус оплаты
 * @param {string|null} expiresAt - Дата окончания подписки (ISO string)
 */
export async function setUserPaidStatus(telegramId, isPaid = true, expiresAt = null) {
    if (!supabase || !telegramId) return null;
    try {
        const updateData = {
            is_paid: isPaid,
            subscription_type: isPaid ? 'premium' : 'free',
            last_seen: new Date().toISOString()
        };

        if (expiresAt) {
            updateData.subscription_expires_at = expiresAt;
        } else if (!isPaid) {
            // Если снимаем премиум — зануляем дату
            updateData.subscription_expires_at = null;
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', telegramId)
            .select();

        if (error) {
            console.error('Error updating user paid status:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('Catch error update status:', e);
        return null;
    }
}

/**
 * Логирование платежа
 * @param {Object} paymentData - Данные платежа
 */
export async function logPayment({ telegramId, amount, currency, type, status = 'completed' }) {
    if (!supabase || !telegramId) return null;
    try {
        const { data, error } = await supabase
            .from('payments')
            .insert([{
                user_id: telegramId,
                amount: amount,
                currency: currency,
                payment_type: type,
                status: status
            }])
            .select();

        if (error) {
            console.error('Error logging payment:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('Catch error log payment:', e);
        return null;
    }
}

export async function getStats() {
    if (!supabase) return null;

    const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    const { count: paidUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_paid', true);

    const { count: premiumUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium', true);

    const { count: totalChecks } = await supabase
        .from('checks')
        .select('*', { count: 'exact', head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayChecks } = await supabase
        .from('checks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

    return {
        totalUsers: totalUsers || 0,
        paidUsers: paidUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalChecks: totalChecks || 0,
        todayChecks: todayChecks || 0
    };
}

/**
 * Установка статуса оплаты пользователя по username
 * @param {string} username - Юзернейм (с @ или без)
 * @param {boolean} isPaid - Статус оплаты
 */
export async function setUserPaidStatusByUsername(username, isPaid = true) {
    if (!supabase || !username) return { success: false, error: 'No database or username' };

    // Очищаем от @ если есть
    const cleanUsername = username.replace('@', '').trim();

    try {
        // Ищем пользователя по username
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();

        if (findError) throw findError;
        if (!user) return { success: false, error: 'User not found' };

        // Обновляем статус
        const result = await setUserPaidStatus(user.id, isPaid);
        return { success: !!result, userId: user.id };
    } catch (e) {
        console.error('Error in setUserPaidStatusByUsername:', e);
        return { success: false, error: e.message };
    }
}

/**
 * Получает текущий статус приложения из таблицы app_status (как в threads-valentines)
 * @returns {Promise<Object>}
 */
export async function getAppStatus() {
    if (!supabase) return { is_maintenance: false };
    try {
        const { data, error } = await supabase
            .from('app_status')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching app status:', error);
            return { is_maintenance: false };
        }

        return data || { is_maintenance: false };
    } catch (e) {
        console.error('Catch error fetching app status:', e);
        return { is_maintenance: false };
    }
}

/**
 * Проверяет, включен ли режим технических работ
 * @returns {Promise<boolean>}
 */
export async function getMaintenanceMode() {
    const status = await getAppStatus();
    return status?.is_maintenance === true;
}

