import { setUserPaidStatus, logPayment } from './lib/supabase.js';
import crypto from 'crypto';

// Vercel config to receive raw body string
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const tributeKey = process.env.TRIBUTE_API_KEY;
        const signature = req.headers['trbt-signature'];

        // Collect raw body
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString('utf8');

        // 1. Проверка подписи (Security)
        if (tributeKey && signature) {
            const hmac = crypto.createHmac('sha256', tributeKey);
            const calculatedSignature = hmac.update(rawBody).digest('hex');

            if (calculatedSignature !== signature) {
                console.warn('Invalid Tribute signature');
                return res.status(401).send('Invalid signature');
            }
        } else if (tributeKey && !signature) {
            console.warn('Missing trbt-signature header');
            return res.status(401).send('Missing signature');
        }

        const body = JSON.parse(rawBody);

        // 2. Обработка тестового события
        if (body.test_event) {
            console.log('Received Tribute TEST event');
            return res.status(200).json({ status: 'ok', message: 'Test event received' });
        }

        const { name, payload } = body;
        console.log(`Received Tribute webhook: ${name}`, payload);

        // 3. Обработка событий подписки/покупки
        if (['new_subscription', 'renewed_subscription', 'new_digital_product'].includes(name)) {
            const telegramId = payload.telegram_user_id;
            const expiresAt = payload.expires_at || null;

            if (telegramId) {
                const amount = payload.amount || 0;
                let checksToAdd = 30; // По умолчанию 30

                // ТИРИНГ: 100 руб = 5 проверок, 299 руб = 30 проверок
                // Проверяем примерные значения (могут быть копейки или валютные колебания)
                if (amount >= 90 && amount < 200) {
                    checksToAdd = 5;
                } else if (amount >= 200) {
                    checksToAdd = 30;
                }

                console.log(`Updating paid status for user: ${telegramId}, amount: ${amount}, checks: ${checksToAdd}, expires: ${expiresAt}`);
                await setUserPaidStatus(telegramId, true, expiresAt, checksToAdd);

                // Логируем платеж в таблицу payments
                await logPayment({
                    telegramId,
                    amount: payload.amount || 0,
                    currency: (payload.currency || 'eur').toUpperCase(),
                    type: payload.subscription_id ? 'subscription' : 'digital_product',
                    status: 'completed'
                });
            }
        } else if (['cancelled_subscription', 'digital_product_refunded'].includes(name)) {
            const telegramId = payload.telegram_user_id;
            if (telegramId) {
                console.log(`Revoking paid status for user: ${telegramId}`);
                await setUserPaidStatus(telegramId, false);
            }
        }

        return res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(400).json({ error: 'invalid_payload' });
    }
}
