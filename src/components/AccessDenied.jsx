import React from 'react';
import { motion } from 'framer-motion';

const AccessDenied = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-screen"
        >
            <div className="error-card">
                <div className="error-icon" style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}>
                    📱
                </div>
                <h1 className="error-title">Доступ ограничен</h1>
                <p className="error-message">
                    Этим приложением можно пользоваться только внутри приложения **Telegram**.
                </p>
                <p className="error-submessage" style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '10px' }}>
                    Пожалуйста, открой нашего бота и нажми кнопку «Запустить», чтобы начать анализ.
                </p>
                <a
                    href="https://t.me/threadsneuro_bot"
                    className="retry-button"
                    style={{ textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}
                >
                    Открыть в Telegram
                </a>
            </div>
        </motion.div>
    );
};

export default AccessDenied;
