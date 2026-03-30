import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';

export default function LoadingScreen() {
    const { t } = useI18n();

    const phases = [
        { text: t('phase_scanning'), icon: "search" },
        { text: t('phase_cognitive'), icon: "psychology" },
        { text: t('phase_emotional'), icon: "favorite" },
        { text: t('phase_social'), icon: "groups" },
        { text: t('phase_shadow'), icon: "mist" },
        { text: t('phase_behavior'), icon: "fingerprint" },
        { text: t('phase_defense'), icon: "shield" },
        { text: t('phase_growth'), icon: "trending_up" },
        { text: t('phase_final'), icon: "insights" }
    ];

    const [currentPhase, setCurrentPhase] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPhase(prev => (prev < phases.length - 1 ? prev + 1 : prev));
        }, 3500);
        return () => clearInterval(interval);
    }, [phases.length]);

    useEffect(() => {
        setProgress(Math.round(((currentPhase + 1) / phases.length) * 100));
    }, [currentPhase, phases.length]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(5px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="loading-screen w-full flex flex-col items-center justify-center p-6"
        >

            {/* Title */}
            <h2 className="loading-title">{t('loading_title')}</h2>
            <p className="loading-subtitle">{t('loading_subtitle')}</p>

            {/* Progress bar */}
            <div className="loading-progress-track">
                <motion.div
                    className="loading-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
            <span className="loading-progress-label">{progress}%</span>

            {/* Phases */}
            <div className="loading-phases">
                {phases.map((phase, idx) => {
                    const isActive = idx === currentPhase;
                    const isCompleted = idx < currentPhase;

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10, scale: 1 }}
                            animate={{
                                opacity: isActive ? 1 : isCompleted ? 0.7 : 0.3,
                                x: 0,
                                scale: isActive ? 1.02 : 1,
                                backgroundColor: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                                borderColor: isActive ? "rgba(0, 122, 255, 0.15)" : "rgba(255, 255, 255, 0)",
                                boxShadow: isActive ? "0 4px 12px rgba(0, 122, 255, 0.1)" : "0 0px 0px rgba(0,0,0,0)"
                            }}
                            transition={{ delay: currentPhase === 0 ? idx * 0.05 : 0, duration: 0.3 }}
                            className="loading-phase-item"
                        >
                            <motion.span
                                className="material-symbols-outlined loading-phase-icon"
                                animate={
                                    isActive
                                        ? { scale: [1, 0.92, 1], color: "#007AFF" }
                                        : { scale: 1, color: isCompleted ? "#10B981" : "#8E8E93" }
                                }
                                transition={
                                    isActive
                                        ? { scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }, color: { duration: 0.3 } }
                                        : { duration: 0.3 }
                                }
                            >
                                {isCompleted ? 'check_circle' : phase.icon}
                            </motion.span>
                            <span className="loading-phase-text">{phase.text}</span>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
