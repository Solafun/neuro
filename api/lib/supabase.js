import { createClient } from '@supabase/supabase-js';

// Жёстко глушим варнинг DEP0169 (url.parse) на уровне stderr,
// так как Node.js пишет его напрямую из движка, минуя console.error и emitWarning
if (typeof process !== 'undefined' && process.stderr && !process.stderr.__dep0169_patched) {
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = function (chunk, encoding, callback) {
        if (typeof chunk === 'string' && chunk.includes('DEP0169')) return true;
        return origWrite(chunk, encoding, callback);
    };
    process.stderr.__dep0169_patched = true;
}

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
    if (!supabase || !telegramUser) return null;

    const { id, username, first_name, last_name, language_code, is_premium } = telegramUser;
    console.log(`Tracking user: ${id} (${username})`);

    const { data: userRow, error } = await supabase.from('users').upsert({
        id: id,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        language_code: language_code || null,
        is_premium: is_premium || false,
        last_seen: new Date().toISOString()
    }, { onConflict: 'id' }).select('is_admin').single();

    if (error) {
        console.error('Supabase trackUser error:', error.message, error.details);
        return null;
    }

    return userRow;
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

    // ОПЦИОНАЛЬНО: Пытаемся создать "скелет" пользователя, если его нет в базе
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

    // ИНКРЕМЕНТ СЧЕТЧИКА В ТАБЛИЦЕ USERS
    if (telegramId) {
        await incrementChecksCount(telegramId);
    }
}

/**
 * Атомарное увеличение счетчика проверок
 */
export async function incrementChecksCount(telegramId) {
    if (!supabase || !telegramId) return;

    // Мы пробуем сделать это через RPC (самый надежный способ для инкремента)
    const { error } = await supabase.rpc('increment_checks_count', { user_id_param: telegramId });

    if (error) {
        console.warn('RPC increment failed, falling back to manual update:', error.message);
        // Fallback: ручное обновление (не атомарно, но лучше чем ничего)
        try {
            const { data: user } = await supabase.from('users').select('checks_count').eq('id', telegramId).single();
            const currentCount = user?.checks_count || 0;
            await supabase.from('users').update({ checks_count: currentCount + 1 }).eq('id', telegramId);
        } catch (e) {
            console.error('Manual increment failed:', e.message);
        }
    }
}

/**
 * Уменьшает счётчик проверок (бесплатных или платных)
 * @param {number} telegramId
 * @param {boolean} isPaid - true = decrement paid_checks, false = decrement free_checks
 */
export async function decrementCheck(telegramId, isPaid) {
    if (!supabase || !telegramId) return null;
    const column = isPaid ? 'paid_checks_remaining' : 'free_checks_remaining';
    try {
        const { data: user } = await supabase.from('users').select(column).eq('id', telegramId).single();
        const current = user?.[column] ?? 0;
        if (current > 0) {
            const newVal = current - 1;
            await supabase.from('users').update({ [column]: newVal }).eq('id', telegramId);
            console.log(`Decremented ${column} for user ${telegramId}: ${current} -> ${newVal}`);
            return newVal;
        }
        return 0;
    } catch (e) {
        console.error(`Error decrementing ${column}:`, e.message);
        return null;
    }
}

/**
 * Установка статуса подписки через канал
 */
export async function setChannelSubscription(userId, isActive) {
    if (!supabase) return;

    const updateData = {
        is_paid: isActive,
        subscription_type: isActive ? 'channel' : 'free',
        subscription_expires_at: null
    };
    // При активации подписки добавляем +30 проверок к текущему остатку
    if (isActive) {
        try {
            const { data: user } = await supabase.from('users').select('paid_checks_remaining').eq('id', userId).single();
            const current = user?.paid_checks_remaining ?? 0;
            updateData.paid_checks_remaining = current + 30;
        } catch (e) {
            console.error('Error fetching current checks for additive update:', e.message);
            updateData.paid_checks_remaining = 30; // Fallback
        }
    }
    await supabase.from('users').update(updateData).eq('id', userId);
}

/**
 * Получение статуса пользователя (оплачено или нет)
 */
export async function checkUserStatus(telegramId) {
    if (!supabase || !telegramId) {
        console.warn(`checkUserStatus: Missing supabase or telegramId (${telegramId})`);
        return { isPaid: false };
    }
    try {
        const { data, error } = await supabase
            .from('users')
            .select('is_paid, subscription_expires_at, is_admin, free_checks_remaining, paid_checks_remaining')
            .eq('id', telegramId)
            .maybeSingle();

        if (error) {
            console.error(`checkUserStatus: DB error for user ${telegramId}:`, error.message);
            return { isPaid: false, isAdmin: false, freeChecks: 1, paidChecks: 0 };
        }

        if (!data) {
            console.warn(`checkUserStatus: user ${telegramId} not found in DB`);
            return { isPaid: false, isAdmin: false, freeChecks: 1, paidChecks: 0 };
        }

        // Если оплачено, проверяем дату окончания
        if (data.is_paid && data.subscription_expires_at) {
            const now = new Date();
            const expires = new Date(data.subscription_expires_at);
            if (expires < now) {
                console.log(`Subscription expired for user ${telegramId}, auto-revoking.`);
                await setUserPaidStatus(telegramId, false, null);
                return { isPaid: false, isAdmin: !!data.is_admin, freeChecks: data.free_checks_remaining ?? 0, paidChecks: 0 };
            }
        }

        return {
            isPaid: !!data.is_paid,
            isAdmin: !!data.is_admin,
            freeChecks: data.free_checks_remaining ?? 0,
            paidChecks: data.paid_checks_remaining ?? 0
        };
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
 * @param {number} checksToAdd - Сколько проверок добавить (по умолчанию 30)
 */
export async function setUserPaidStatus(telegramId, isPaid = true, expiresAt = null, checksToAdd = 30) {
    if (!supabase || !telegramId) return null;
    try {
        const updateData = {
            is_paid: isPaid,
            subscription_type: isPaid ? 'premium' : 'free',
            last_seen: new Date().toISOString()
        };

        // При активации подписки добавляем проверки к текущему остатку
        if (isPaid) {
            try {
                const { data: user } = await supabase.from('users').select('paid_checks_remaining').eq('id', telegramId).single();
                const current = user?.paid_checks_remaining ?? 0;
                updateData.paid_checks_remaining = current + checksToAdd;
                console.log(`Accrued +${checksToAdd} checks for user ${telegramId}. New target: ${updateData.paid_checks_remaining}`);
            } catch (e) {
                console.error('Error fetching current checks for accrual:', e.message);
                updateData.paid_checks_remaining = checksToAdd; // Fallback
            }
        }

        if (expiresAt) {
            updateData.subscription_expires_at = expiresAt;
        } else if (!isPaid) {
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

/**
 * Синхронизирует количество проверок для всех пользователей из таблицы checks.
 * Можно запустить один раз после добавления колонки checks_count.
 */
export async function syncAllUserChecks() {
    if (!supabase) return { success: false, error: 'No Supabase client' };

    console.log('Starting global checks synchronization...');
    try {
        const { data: users, error: userError } = await supabase.from('users').select('id');
        if (userError) throw userError;

        console.log(`Syncing ${users.length} users...`);
        let updatedCount = 0;

        for (const user of users) {
            const { count, error: countError } = await supabase
                .from('checks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (countError) {
                console.error(`Error counting for user ${user.id}:`, countError.message);
                continue;
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ checks_count: count || 0 })
                .eq('id', user.id);

            if (updateError) {
                console.error(`Error updating user ${user.id}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }

        console.log(`Sync complete. Updated ${updatedCount} users.`);
        return { success: true, updatedCount };
    } catch (e) {
        console.error('Sync failed:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Обновляет язык пользователя в базе данных
 * @param {number|string} telegramId
 * @param {string} languageCode
 */
export async function updateUserLanguage(telegramId, languageCode) {
    if (!supabase || !telegramId) return null;
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert(
                { id: telegramId, language_code: languageCode, last_seen: new Date().toISOString() },
                { onConflict: 'id' }
            )
            .select();

        if (error) {
            console.error('Error updating user language:', error.message);
            return null;
        }
        console.log(`Language updated/upserted in DB for user ${telegramId}: ${languageCode}`);
        return data;
    } catch (e) {
        console.error('Catch error update language:', e);
        return null;
    }
}
