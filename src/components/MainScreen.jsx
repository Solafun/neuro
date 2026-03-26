import React from 'react';
import { Sparkles, Brain, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MainScreen({ nickname, setNickname, onAnalyze, userChecks }) {
    const { freeChecks = 1, paidChecks = 0, isPaid = false } = userChecks || {};
    const remainingChecks = isPaid ? paidChecks : freeChecks;
    const totalChecks = isPaid ? 30 : 1;
    const hasChecks = remainingChecks > 0;

    const getChecksText = (count) => {
        if (count === 0) return 'Проверки закончились';
        if (count === 1) return 'Осталась 1 проверка';
        if (count >= 2 && count <= 4) return `Осталось ${count} проверки`;
        return `Осталось ${count} проверок`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hero-container flex-1 flex flex-col items-center justify-start pt-28 w-full"
        >
            <motion.div className="mb-8 animate-slide-up">
                <Brain className="w-16 h-16 text-[var(--primary)] drop-shadow-md" />
            </motion.div>

            <h1 className="hero-title tracking-tight-custom text-balance">
                Нейро-профайлинг <br /><span className="text-shimmer">Threads</span>
            </h1>

            <p className="hero-subtitle opacity-80 mb-12 text-center text-balance max-w-[280px] mx-auto">
                Система анализа на базе 13 аналитических блоков.
            </p>

            <div className={`input-block ring-1 ring-black/5 ${!hasChecks ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`} style={{ marginBottom: '10px' }}>
                <User className="w-5 h-5 text-[var(--text-muted)] shrink-0" strokeWidth={2} />
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={hasChecks ? "Введи никнейм..." : "Проверки закончились"}
                    className="dashboard-input"
                    onKeyPress={(e) => e.key === 'Enter' && hasChecks && onAnalyze()}
                    disabled={!hasChecks}
                />
                <motion.button
                    whileTap={{ scale: hasChecks ? 0.95 : 1 }}
                    onClick={() => hasChecks && onAnalyze()}
                    disabled={!hasChecks || !nickname.trim()}
                    className="input-action-btn ml-2"
                    aria-label="Запустить анализ"
                >
                    <Search className="w-6 h-6 text-white" />
                </motion.button>
            </div>

            {/* Check status block */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className={`checks-status-block ${hasChecks ? 'compact' : ''}`}
            >
                <div className="checks-status-row">
                    <div className="checks-status-left">
                        <span className={`checks-status-icon material-symbols-outlined ${isPaid ? 'text-premium' : ''}`}>
                            {isPaid ? 'diamond' : 'token'}
                        </span>
                        <div className="checks-status-info">
                            <span className="checks-status-label">
                                Статус {isPaid ? 'Premium' : 'Free'}
                            </span>
                            <span className="checks-status-count">
                                {getChecksText(remainingChecks)}
                            </span>
                        </div>
                    </div>
                    {!hasChecks && (
                        <button
                            className="checks-subscribe-btn"
                            onClick={() => window.Telegram?.WebApp?.openTelegramLink('https://t.me/tribute/app?startapp=sR0c')}
                        >
                            Подписка
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Pushing the block fully to the bottom with mt-auto and extra padding top to distance it from input */}
            <div className="mt-auto mb-6 text-[12px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-80 flex items-center justify-center w-full gap-2 text-center">
                Создатель{" "}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#FF2D55" viewBox="0 0 16 16">
                    <path d="M6.321 6.016c-.27-.18-1.166-.802-1.166-.802.756-1.081 1.753-1.502 3.132-1.502.975 0 1.803.327 2.394.948s.928 1.509 1.005 2.644q.492.207.905.484c1.109.745 1.719 1.86 1.719 3.137 0 2.716-2.226 5.075-6.256 5.075C4.594 16 1 13.987 1 7.994 1 2.034 4.482 0 8.044 0 9.69 0 13.55.243 15 5.036l-1.36.353C12.516 1.974 10.163 1.43 8.006 1.43c-3.565 0-5.582 2.171-5.582 6.79 0 4.143 2.254 6.343 5.63 6.343 2.777 0 4.847-1.443 4.847-3.556 0-1.438-1.208-2.127-1.27-2.127-.236 1.234-.868 3.31-3.644 3.31-1.618 0-3.013-1.118-3.013-2.582 0-2.09 1.984-2.847 3.55-2.847.586 0 1.294.04 1.663.114 0-.637-.54-1.728-1.9-1.728-1.25 0-1.566.405-1.967.868ZM8.716 8.19c-2.04 0-2.304.87-2.304 1.416 0 .878 1.043 1.168 1.6 1.168 1.02 0 2.067-.282 2.232-2.423a6.2 6.2 0 0 0-1.528-.161" />
                </svg>
                <a
                    href="https://www.threads.net/@usemikehelp"
                    style={{ color: '#FF2D55' }}
                    className="transition-colors hover:opacity-80"
                    onClick={(e) => {
                        if (window.Telegram?.WebApp) {
                            e.preventDefault();
                            window.Telegram.WebApp.openLink('https://www.threads.net/@usemikehelp');
                        }
                    }}
                >
                    usemikehelp
                </a>
            </div>
        </motion.div>
    );
}