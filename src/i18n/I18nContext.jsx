import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';
import { updateUserLanguage } from '../services/api';

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
    const [language, setLanguage] = useState('ru');

    useEffect(() => {
        // 1. Check LocalStorage
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && translations[savedLang]) {
            setLanguage(savedLang);
            return;
        }

        // 2. Check Telegram WebApp language
        const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
        if (tgLang && translations[tgLang]) {
            setLanguage(tgLang);
            return;
        }

        // 3. Default
        setLanguage('ru');
    }, []);

    const t = (key, params = {}) => {
        let text = translations[language]?.[key] || translations['ru']?.[key] || key;
        Object.keys(params).forEach(p => {
            text = text.replace(`{${p}}`, params[p]);
        });
        return text;
    };

    const changeLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
            localStorage.setItem('app_language', lang);

            // Sync with database if telegram user is available
            const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (telegramId) {
                updateUserLanguage(telegramId, lang);
            }
        }
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
