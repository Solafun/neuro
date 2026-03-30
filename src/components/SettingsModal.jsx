import React from 'react';
import { motion } from 'framer-motion';
import { X, Globe } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function SettingsModal({ onClose }) {
    const { language, setLanguage, t } = useI18n();

    const languages = [
        { code: 'ru', name: 'Русский', label: '🇷🇺' },
        { code: 'en', name: 'English', label: '🇺🇸' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-t-[32px] p-8 shadow-2xl ring-1 ring-black/5 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-black/10 rounded-full mb-8" />

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                        <Globe className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-black/80">{t('settings_title')}</h2>
                </div>

                <div className="w-full space-y-3 mb-8">
                    <label className="text-xs font-bold text-black/30 uppercase tracking-widest pl-2 mb-2 block">
                        {t('language')}
                    </label>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setTimeout(onClose, 100);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] ${language === lang.code
                                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25'
                                    : 'bg-black/5 text-black/60 hover:bg-black/10'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{lang.label}</span>
                                <span className="font-semibold">{lang.name}</span>
                            </div>
                            {language === lang.code && (
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-black text-white font-bold tracking-tight active:scale-95 transition-all shadow-xl"
                >
                    {t('back')}
                </button>
            </motion.div>
        </motion.div>
    );
}
