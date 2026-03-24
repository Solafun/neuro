import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { y: 15, opacity: 0 },
    show: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 150,
            damping: 18,
            mass: 1
        }
    }
};

export default function ErrorScreen({ message, onReset }) {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="hero-container flex-1 flex flex-col items-center justify-start pt-28 w-full"
        >
            <motion.div
                variants={item}
                className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl flex items-center justify-center mb-10 ring-1 ring-black/5 relative"
            >
                <div className="absolute inset-0 rounded-[32px] border-4 border-red-500/20 opacity-20" />
                <AlertCircle className="w-12 h-12 text-red-500" />
            </motion.div>

            <motion.h1 variants={item} className="hero-title">
                Ошибка анализа
            </motion.h1>

            <motion.div variants={item} className="dashboard-card !bg-white/40 ring-1 ring-black/5 mb-8">
                <p className="text-[17px] font-medium text-[var(--text)] text-center leading-relaxed">
                    {message || 'Не удалось получить данные профиля. Проверьте никнейм или попробуйте позже.'}
                </p>
            </motion.div>

            <motion.div variants={item} className="w-full flex justify-center">
                <button
                    onClick={onReset}
                    className="glass-button"
                >
                    <RefreshCw /> Попробовать снова
                </button>
            </motion.div>
        </motion.div>
    );
}
