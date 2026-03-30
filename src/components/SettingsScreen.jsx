import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowLeft, Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function SettingsScreen({ onBack }) {
    const { language, setLanguage, t } = useI18n();

    const languages = [
        { code: 'ru', name: 'Русский', label: '🇷🇺' },
        { code: 'en', name: 'English', label: '🇺🇸' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col w-full"
        >
            <div className="flex items-center gap-4 mb-8 pt-6">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-black/5 active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">{t('settings_title')}</h1>
            </div>

            <p className="text-xs font-bold text-black/30 uppercase tracking-widest pl-2 mb-6">
                {t('language')}
            </p>

            <div className="grid grid-cols-2 gap-4">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`lang-tile aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-[28px] transition-all active:scale-[0.95] relative ${language === lang.code
                                ? 'bg-white shadow-xl shadow-black/5 ring-1 ring-black/5 ring-inset'
                                : 'bg-black/5 grayscale-[0.5] hover:bg-black/10'
                            }`}
                    >
                        <span className="text-4xl mb-1">{lang.label}</span>
                        <span className={`font-bold text-base ${language === lang.code ? 'text-black' : 'text-black/40'}`}>
                            {lang.name}
                        </span>

                        {language === lang.code && (
                            <motion.div
                                layoutId="active-check"
                                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-white"
                            >
                                <Check className="w-4 h-4" strokeWidth={3} />
                            </motion.div>
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-auto mb-8 p-6 rounded-3xl bg-black/5 border border-dashed border-black/10 flex flex-col items-center text-center">
                <Globe className="w-8 h-8 text-black/20 mb-3" />
                <p className="text-sm text-black/40 font-medium">
                    {t('settings_help_text') || 'App language is synced with your Telegram settings, but you can override it here.'}
                </p>
            </div>
        </motion.div>
    );
}
