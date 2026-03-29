import axios from 'axios';
import { trackUser, getStats, setChannelSubscription, setUserPaidStatusByUsername, getAppStatus, checkUserStatus } from './lib/supabase.js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const PAID_CHANNEL_ID = process.env.PAID_CHANNEL_ID; // ID канала/группы
const WEBAPP_URL = "https://threadsneuro.vercel.app/";

/**
 * Проверка членства в канале
 */
async function checkChannelMembership(userId) {
    if (!PAID_CHANNEL_ID) return false;
    try {
        const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatMember`, {
            params: { chat_id: PAID_CHANNEL_ID, user_id: userId }
        });
        const status = response.data.result.status;
        return ['member', 'administrator', 'creator'].includes(status);
    } catch (error) {
        console.error('Error checking membership:', error);
        return false;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    if (!TELEGRAM_TOKEN) {
        console.error("CRITICAL: TELEGRAM_BOT_TOKEN is missing from environment variables");
        return res.status(500).send('Bot token missing');
    }

    try {
        const body = req.body;
        if (!body) {
            console.error("Empty request body");
            return res.status(200).send('Empty body');
        }

        console.log("Telegram update:", JSON.stringify(body));

        // 0. ПРОВЕРКА РЕЖИМА ТЕХРАБОТ
        const appStatus = await getAppStatus();
        const isMaintenance = appStatus?.is_maintenance === true;
        const maintenanceMsg = appStatus?.maintenance_message || "В данный момент ведутся технические работы. Пожалуйста, попробуйте позже.";

        // 1. ОБРАБОТКА ВСТУПЛЕНИЯ/ВЫХОДА (chat_member)
        if (body.chat_member) {
            const update = body.chat_member;
            if (PAID_CHANNEL_ID && String(update.chat.id) === String(PAID_CHANNEL_ID)) {
                const userId = update.from.id;
                const isNowMember = ['member', 'administrator', 'creator'].includes(update.new_chat_member?.status);
                console.log(`Updating channel subscription for ${userId}: ${isNowMember}`);
                await setChannelSubscription(userId, isNowMember);
            }
            return res.status(200).send('OK');
        }

        // 2. УНИФИЦИРОВАННАЯ ОБРАБОТКА (message или callback_query)
        const message = body.message || body.callback_query?.message;
        const user = body.message?.from || body.callback_query?.from;
        const chatId = message?.chat?.id;

        if (user) {
            // Трекаем пользователя ПЕРЕД любой обработкой (чтобы он был в базе)
            const userRow = await trackUser(user);

            // Проверяем статус админа (ENV + DB)
            let isAdmin = ADMIN_ID && String(user.id) === String(ADMIN_ID);
            if (!isAdmin && userRow?.is_admin) {
                isAdmin = true;
            }

            // Обработка текстовых сообщений
            if (body.message) {
                const text = body.message.text || "";
                console.log(`Message from ${user.id}: "${text}"`);

                if (isMaintenance && !isAdmin) {
                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `🛠 **${maintenanceMsg}**`,
                        parse_mode: 'Markdown'
                    });
                    return res.status(200).send('OK');
                }

                // Команда /start
                if (text.startsWith('/start')) {
                    console.log("Handling /start command");
                    const isMember = await checkChannelMembership(user.id);
                    if (isMember) {
                        await setChannelSubscription(user.id, true);
                    }

                    const safeName = (user.first_name || "друг").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const messageText = `👋 Привет, <b>${safeName}</b>!\n\n` +
                        `🤖 Я — <b>Threads Neuro</b>. Я использую нейросети для проведения глубокого психологического анализа личности на основе твоего профиля и публикаций.\n\n` +
                        `🔍 <b>Что я могу:</b>\n` +
                        `• Составить твой психологический портрет\n` +
                        `• Определить твой стиль общения и поведения\n` +
                        `• Найти скрытые конфликты и «слепые зоны»\n` +
                        `• Оценить уровень токсичности и манипулятивности\n\n` +
                        `${isMember ? '💎 Тебе доступен <b>Premium</b> статус!' : 'Жми кнопку ниже, чтобы начать! 👇'}`;

                    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: messageText,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [[{
                                text: '🚀 Запустить анализ',
                                web_app: { url: WEBAPP_URL }
                            }]]
                        }
                    });
                }

                // Команда /admin - Статистика
                else if (text === '/admin') {
                    console.log(`Admin stats command by ${user.id}`);
                    if (isAdmin) {
                        const stats = await getStats();
                        if (!stats) {
                            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                                chat_id: chatId,
                                text: "❌ База данных не настроена."
                            });
                        } else {
                            const statsText = `📊 **Статистика бота**\n\n` +
                                `👥 Всего пользователей: **${stats.totalUsers}**\n` +
                                `⭐ Telegram Premium: **${stats.premiumUsers}**\n` +
                                `💎 Платных (подписки): **${stats.paidUsers}**\n\n` +
                                `✅ Всего проверок: **${stats.totalChecks}**\n` +
                                `📅 Проверок сегодня: **${stats.todayChecks}**`;

                            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                                chat_id: chatId,
                                text: statsText,
                                parse_mode: 'Markdown'
                            });
                        }
                    }
                }

                // Команда /paid <username> <on/off>
                else if (text.startsWith('/paid')) {
                    console.log(`Admin paid command by ${user.id}: ${text}`);
                    if (isAdmin) {
                        const parts = text.split(/\s+/);
                        if (parts.length < 3) {
                            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                                chat_id: chatId,
                                text: "💡 Формат: `/paid <username> <on/off>`\nПример: `/paid usemikehelp on`",
                                parse_mode: 'Markdown'
                            });
                        } else {
                            const targetUsername = parts[1];
                            const statusStr = parts[2].toLowerCase();
                            const isPaid = ['on', 'true', '1', 'вкл'].includes(statusStr);
                            const result = await setUserPaidStatusByUsername(targetUsername, isPaid);

                            let responseText = result.success
                                ? `✅ Пользователь **@${targetUsername.replace('@', '')}** (ID: ${result.userId}) теперь **${isPaid ? 'Premium' : 'Free'}**.`
                                : `❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`;

                            await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                                chat_id: chatId,
                                text: responseText,
                                parse_mode: 'Markdown'
                            });
                        }
                    }
                }
            }

            // Обработка нажатий на кнопки
            if (body.callback_query) {
                console.log(`Callback from ${user.id}: "${body.callback_query.data}"`);
                // Можно добавить специфичную логику для колбэков здесь
                // Для трекинга пользователя достаточно того, что мы уже вызвали trackUser(user) выше

                await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: body.callback_query.id
                });
            }
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('CRITICAL: Error handling bot update:', error.message);
        if (error?.response) {
            console.error('Telegram API error response:', error.response.data);
        }
        return res.status(200).send('OK');
    }
}
