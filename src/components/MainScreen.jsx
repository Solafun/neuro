import React, { useState, useEffect } from 'react';
import { Brain, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';

export default function MainScreen({ nickname, setNickname, onAnalyze, userChecks, analysisMode, setAnalysisMode }) {
    const { t } = useI18n();
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            // Standard keyboard detection: if height decreases significantly (e.g., > 25%)
            // Or if innerHeight is very small on mobile
            const isKeyboardNow = window.innerHeight < (window.screen.height * 0.7);
            setIsKeyboardVisible(isKeyboardNow);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { freeChecks = 1, paidChecks = 0, isPaid = false } = userChecks || {};
    const remainingChecks = isPaid ? paidChecks : freeChecks;
    const hasChecks = remainingChecks > 0;

    const getChecksText = (count) => {
        if (count === 0) return t('checks_none');
        if (count === 1) return t('checks_one');
        if (count >= 2 && count <= 4) return t('checks_few', { count });
        return t('checks_many', { count });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hero-container flex-1 flex flex-col items-center justify-start pt-[50px] px-6 w-full relative min-h-[100dvh]"
        >
            <motion.div className="mb-8 animate-slide-up">
                <Brain className="w-16 h-16 text-[var(--primary)] drop-shadow-md" />
            </motion.div>

            <h1 className="hero-title tracking-tight-custom text-balance mb-4">
                {t('hero_title')} <br /><span className="text-shimmer">Threads</span>
            </h1>

            <p className="hero-subtitle opacity-80 mb-6 text-center text-balance max-w-[320px] mx-auto text-[13px] font-medium leading-relaxed">
                {t(analysisMode === 'new' ? 'hero_subtitle_relationship' : 'hero_subtitle_classic')}
            </p>

            {/* Analysis mode switcher — premium only */}
            {isPaid && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="analysis-mode-pills mb-8"
                >
                    <button
                        className={`pill ${analysisMode === 'classic' ? 'active' : ''}`}
                        onClick={() => setAnalysisMode('classic')}
                    >
                        {t('analysis_mode_classic').toUpperCase()}
                    </button>
                    <button
                        className={`pill ${analysisMode === 'new' ? 'active' : ''}`}
                        onClick={() => setAnalysisMode('new')}
                    >
                        {t('analysis_mode_new').toUpperCase()}
                    </button>
                </motion.div>
            )}

            <div className={`input-block ring-1 ring-black/5 mb-4 ${!hasChecks ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                <User className="w-5 h-5 text-[var(--text-muted)] opacity-40 shrink-0" strokeWidth={2} />
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={hasChecks ? t('input_placeholder') : t('checks_ended')}
                    className="dashboard-input flex-1 bg-transparent border-none outline-none text-[15px] font-medium py-2 px-2"
                    onFocus={() => setIsKeyboardVisible(true)}
                    onBlur={() => setTimeout(() => setIsKeyboardVisible(false), 200)}
                    onKeyPress={(e) => e.key === 'Enter' && hasChecks && nickname.trim() && onAnalyze(nickname)}
                    disabled={!hasChecks}
                />
                <motion.button
                    whileTap={{ scale: hasChecks ? 0.95 : 1 }}
                    onClick={() => hasChecks && nickname.trim() && onAnalyze(nickname)}
                    disabled={!hasChecks || !nickname.trim()}
                    className="input-action-btn ml-2 bg-[var(--primary)] p-2.5 rounded-full shadow-lg transition-all"
                    aria-label={t('new_analysis')}
                >
                    <Search className="w-6 h-6 text-white" />
                </motion.button>
            </div>

            {/* Check status block */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className={`checks-status-block w-full max-w-sm ${hasChecks ? 'compact' : ''}`}
            >
                <div className="status-badge w-full py-4 px-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm text-center">
                    <div className="flex items-center justify-center gap-3">
                        <div className="p-2 rounded-xl bg-[#FFD700]/10 shrink-0">
                            <div className="w-5 h-5 text-[#FFD700]">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L4.5 9L12 22L19.5 9L12 2Z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">
                                {isPaid ? t('status_premium') : t('status_free')}
                            </span>
                            <span className="text-[15px] font-black text-[var(--text)] leading-none">
                                {getChecksText(remainingChecks)}
                            </span>
                        </div>
                    </div>

                    {!hasChecks && (
                        <button
                            className="w-full mt-4 py-4 px-6 rounded-2xl bg-[var(--primary)] text-white shadow-lg active:scale-95 transition-all text-sm font-bold"
                            onClick={() => window.Telegram?.WebApp?.openTelegramLink(t('payment_link'))}
                        >
                            {t('subscribe')}
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Subscriptions toggle to bottom */}
            {!isKeyboardVisible && (
                <div className="mt-auto py-8 text-[11px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-80 flex items-center justify-center w-full gap-2 text-center transition-opacity duration-300">
                    <span className="flex items-center gap-2">
                        {t('creator')}{" "}
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
                    </span>
                </div>
            )}
        </motion.div>
    );
}