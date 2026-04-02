import React from 'react';
import { Brain, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';

export default function MainScreen({ nickname, setNickname, onAnalyze, userChecks, analysisMode, setAnalysisMode }) {
    const { t } = useI18n();

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-start pt-10 px-6 w-full"
        >
            <div className="mb-8 p-4 bg-white/50 backdrop-blur-sm rounded-3xl shadow-sm">
                <Brain className="w-12 h-12 text-[var(--primary)]" />
            </div>

            <div className="text-center mb-8 px-4">
                <h1 className="text-4xl font-black mb-3 tracking-tighter text-[var(--text)]">
                    {t('hero_title')}
                </h1>
                <p className="text-[var(--text-secondary)] text-lg font-medium tracking-tight">
                    {analysisMode === 'new' ? t('hero_subtitle_relationship') : t('hero_subtitle_classic')}
                </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-[var(--card-bg)] p-1 rounded-2xl mb-8 border border-[var(--card-border)] shadow-sm">
                <button
                    onClick={() => setAnalysisMode('classic')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${analysisMode === 'classic'
                        ? 'bg-[var(--primary)] text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                >
                    {t('analysis_mode_classic').toUpperCase()}
                </button>
                <button
                    onClick={() => setAnalysisMode('new')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${analysisMode === 'new'
                        ? 'bg-[var(--primary)] text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                >
                    {t('analysis_mode_new').toUpperCase()}
                </button>
            </div>

            <div className="w-full max-w-sm flex flex-col gap-4">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-[var(--primary)]">
                        <User className="w-5 h-5 opacity-40" />
                    </div>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder={t('input_placeholder')}
                        style={{ height: '60px' }}
                        className="w-full pl-12 pr-14 py-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all shadow-sm"
                    />
                    <button
                        onClick={() => onAnalyze(nickname)}
                        disabled={!nickname.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[var(--primary)] text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <div className="status-badge w-full py-4 px-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-sm text-center">
                        <div className="flex items-center justify-center gap-3">
                            <div className="p-2 rounded-xl bg-[#FFD700]/10">
                                <div className="w-5 h-5 text-[#FFD700]">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L4.5 9L12 22L19.5 9L12 2Z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">{isPaid ? t('status_premium') : t('status_free')}</span>
                                <span className="text-sm font-black text-[var(--text)] leading-none">{getChecksText(remainingChecks)}</span>
                            </div>
                        </div>
                    </div>

                    {!isPaid && (
                        <button
                            className="w-full py-4 px-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-sm font-bold text-[var(--text)] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            onClick={() => window.Telegram?.WebApp?.openTelegramLink(t('payment_link'))}
                        >
                            {t('subscribe')}
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-auto py-8 text-[11px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-80 flex items-center justify-center w-full gap-2 text-center">
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
            </div>
        </motion.div>
    );
}