import React from 'react';
import { motion } from 'framer-motion';

const MaintenanceScreen = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="maintenance-screen"
        >
            <div className="glass-card maintenance-card">
                <div className="icon-wrapper glass-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6-3.8 3.8a1 1 0 0 0 0 1.4l.7.7a1 1 0 0 0 1.4 0l3.8-3.8 1.6 1.6a1 1 0 0 0 1.4 0l1.4-1.4a1 1 0 0 0 0-1.4l-6.7-6.7a1 1 0 0 0-1.4 0l-1.4 1.4z" fill="currentColor" />
                        <path d="M13.3 10.7l-8.6 8.6a2 2 0 0 0 0 2.8l.7.7a2 2 0 0 0 2.8 0l8.6-8.6-3.5-3.5z" fill="currentColor" />
                        <path d="M2 13a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm1 5a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2a1 1 0 0 0-1-1zM11 2a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1z" fill="currentColor" fillOpacity="0.4" />
                    </svg>
                </div>

                <h1 className="maintenance-title">Технические работы</h1>
                <p className="maintenance-description">
                    Мы обновляем систему, чтобы стать лучше. Приложение временно недоступно.
                </p>

                <div className="status-badge">
                    <span className="pulse"></span>
                    Скоро вернемся
                </div>

                <div className="maintenance-footer">
                    Пожалуйста, зайдите позже
                </div>
            </div>
        </motion.div>
    );
};

export default MaintenanceScreen;
