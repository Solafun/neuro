import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';

const AccessDenied = () => {
    const { t } = useI18n();

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
                <h1 className="error-title">{t('access_denied_title')}</h1>
                <p className="error-message">
                    {t('access_denied_text')}
                </p>
                <p className="error-submessage" style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '10px' }}>
                    {t('access_denied_subtitle')}
                </p>
                <a
                    href="https://t.me/ThreadsNeuroBot"
                    className="retry-button"
                    style={{ textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}
                >
                    {t('open_in_telegram')}
                </a>
            </div>
        </motion.div>
    );
};

export default AccessDenied;
