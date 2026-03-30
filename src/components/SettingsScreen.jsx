import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';

export default function SettingsScreen() {
    const { language, setLanguage, t } = useI18n();

    const languages = [
        { code: 'ru', name: 'Русский', label: '🇷🇺' },
        { code: 'en', name: 'English', label: '🇺🇸' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col w-full px-6"
        >
            <div className="pt-24 mb-12 text-center">
                <h1 className="text-3xl font-black tracking-tight uppercase opacity-90">{t('settings_title')}</h1>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`lang-tile w-[150px] h-[150px] flex flex-col items-center justify-center gap-4 rounded-[40px] transition-all active:scale-[0.92] relative ${language === lang.code
                                ? 'bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5'
                                : 'bg-black/5 grayscale-[0.3] hover:bg-black/10 opacity-60'
                            }`}
                    >
                        <span className="text-5xl leading-none">{lang.label}</span>
                        <span className={`font-black text-lg uppercase tracking-tight ${language === lang.code ? 'text-black' : 'text-black/40'}`}>
                            {lang.name}
                        </span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
