import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

// Helper for cleaning text
const formatCamelCase = (text) => {
    if (typeof text !== 'string') return text;
    let cleanText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\uafff]/g, '').trim();
    return cleanText.replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2');
};

const renderValue = (val, fallback = '—') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\uafff]/g, '').trim() || fallback;
    return fallback;
};

const renderPartnerAttraction = (text) => {
    if (!text || typeof text !== 'string') return text;
    let cleanText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff]/g, '').trim();

    const parts = cleanText.split(/(Инсайт:|Insight:)/i);

    if (parts.length === 1) return <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{cleanText}</div>;

    const beforeInsight = parts[0].trim();
    const insightKeyword = parts[1];
    const insightText = parts.slice(2).join('').trim();

    return (
        <div className="flex flex-col gap-4">
            {beforeInsight && <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{beforeInsight}</div>}
            <div className="plan-warning" style={{ background: 'rgba(255, 45, 85, 0.05)', color: '#FF2D55', borderLeft: '3px solid #FF2D55', margin: 0, padding: '12px 16px' }}>
                {insightText}
            </div>
        </div>
    );
};

const renderRelationshipPattern = (text) => {
    if (!text || typeof text !== 'string') return text;
    let cleanText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff]/g, '').trim();

    return (
        <div className="flex flex-col gap-3">
            {cleanText.split('\n').filter(line => line.trim().length > 0).map((line, i) => {
                let color = 'var(--text)';
                let bulletColor = 'bg-gray-300';
                if (/Начало:|Beginning:/i.test(line)) {
                    color = '#007AFF';
                    bulletColor = 'bg-[#007AFF]';
                } else if (/Развитие:|Development:/i.test(line)) {
                    color = '#FF9500';
                    bulletColor = 'bg-[#FF9500]';
                } else if (/Итог:|Outcome:/i.test(line)) {
                    color = '#34C759';
                    bulletColor = 'bg-[#34C759]';
                }

                const parts = line.split(/(Начало:|Развитие:|Итог:|Beginning:|Development:|Outcome:)/i);
                if (parts.length > 2) {
                    return (
                        <div key={i} className="flex gap-3 items-start mb-2">
                            <div className={`mt-[8.5px] w-[6px] h-[6px] rounded-full shrink-0 ${bulletColor} shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}></div>
                            <div style={{ color: color, fontSize: '14px', lineHeight: '1.6' }}>
                                <strong>{parts[1]}</strong><span className="ml-1">{parts.slice(2).join('')}</span>
                            </div>
                        </div>
                    );
                }
                return (
                    <div key={i} className="flex gap-3 items-start mb-2">
                        <div className={`mt-[8.5px] w-[6px] h-[6px] rounded-full shrink-0 ${bulletColor} shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}></div>
                        <div style={{ color: color, fontSize: '14px', lineHeight: '1.6' }}>{line}</div>
                    </div>
                );
            })}
        </div>
    );
};

// Modified PremiumGate: mostly passes through since this mode is premium-only,
// but kept for future-proofing or strict gating.
const PremiumGate = ({ isPaid, children, title, compact = false }) => {
    const { t } = useI18n();
    const gateTitle = title || t('section_locked');

    if (isPaid) return children;

    return (
        <div className={`premium-container ${compact ? 'compact-gate' : ''}`}>
            <div className="premium-blur">
                {children}
            </div>
            <div className="premium-overlay">
                <div className="premium-lock-icon">
                    <span className="material-symbols-outlined">lock</span>
                </div>
                <h4 className="premium-title">{gateTitle}</h4>
                <p className="premium-text">
                    {compact
                        ? t('subscription_unlock_compact')
                        : t('subscription_unlock_full')}
                </p>
                <button className="btn-unlock" onClick={() => window.Telegram?.WebApp?.openTelegramLink(t('payment_link'))}>
                    {t('open_access')}
                </button>
            </div>
        </div>
    );
};

export default function RelationshipResultScreen({ result, onReset }) {
    const { t } = useI18n();
    if (!result) return null;

    // Generate Share string for copying
    const handleShare = () => {
        if (result.share_hook && window.Telegram && window.Telegram.WebApp) {
            // Using modern telegram copy to clipboard or open link with text
            const shareText = result.share_hook + "\n\n" + "🔥 https://t.me/threads_neurobot";
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`);
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="result-container"
        >
            {/* ===== HEADER ===== */}
            <motion.header variants={item} className="result-header">
                <div className="avatar-glow-wrapper">
                    <div
                        className="avatar-glow"
                        style={{
                            background: '#AF52DE', // Theme colors for relationships: Purple/Violet
                            opacity: 0.6
                        }}
                    />
                    <div
                        className="avatar-ring"
                        style={{
                            background: 'linear-gradient(135deg, #AF52DE 0%, #FF2D55 100%)',
                            boxShadow: '0 8px 32px rgba(175, 82, 222, 0.3)'
                        }}
                    >
                        <div className="avatar-inner">
                            <div
                                className="avatar-image"
                                style={{
                                    backgroundImage: `url(${result.avatar || `https://ui-avatars.com/api/?name=${result.nickname}&background=AF52DE&color=fff&size=96`})`
                                }}
                            />
                        </div>
                    </div>
                </div>
                <h1 className="result-nickname">@{result.nickname}</h1>
                <p className="result-subtitle">{t('analysis_mode_new')} • {t('psychological_profile')}</p>

                {result.share_hook && (
                    <div className="mt-4 w-full px-4 mb-2">
                        <button
                            onClick={handleShare}
                            className="bg-[#1C1C1E] text-white hover:bg-black/80 text-[14px] font-bold py-3.5 px-6 rounded-[20px] w-full transition-colors flex items-center justify-center gap-2 shadow-xl"
                        >
                            <span className="material-symbols-outlined text-lg" style={{ color: '#AF52DE' }}>share</span>
                            <span className="italic font-medium text-white">{renderValue(result.share_hook)}</span>
                        </button>
                    </div>
                )}
            </motion.header>

            {/* ===== TRUTH BOMB ===== */}
            <motion.section variants={item} className="card-dark" style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2A1B38 100%)' }}>
                <div className="card-header-dark">
                    <span className="material-symbols-outlined icon-primary" style={{ color: '#AF52DE' }}>terminal</span>
                    <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{t('rel_truth_bomb')}</h3>
                </div>
                <p className="card-text text-[15px] font-medium leading-[1.6]" style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)' }}>
                    {renderValue(result.truth_bomb)}
                </p>
            </motion.section>

            {/* ===== IDEAL SELF vs REALITY ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="card-header pb-2">
                    <span className="material-symbols-outlined icon-primary" style={{ color: '#AF52DE' }}>compare_arrows</span>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_ideal_vs_real')}</h3>
                </div>

                <div className="mt-2 mb-6">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                        <span className="material-symbols-outlined text-[16px] text-emerald-500">hotel_class</span>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-500">{t('rel_ideal_self')}</span>
                    </div>
                    <div className="plan-success-bubble" style={{ background: 'rgba(52, 199, 89, 0.08)', color: 'var(--text)', border: 'none', margin: 0 }}>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{renderValue(result.ideal_self)}</div>
                    </div>
                </div>

                <div className="mb-2">
                    <div className="flex items-center gap-1.5 mb-2 px-1 opacity-60">
                        <span className="material-symbols-outlined text-[16px]">movie_info</span>
                        <span className="text-[11px] uppercase tracking-wider font-bold">{t('rel_real_behavior')}</span>
                    </div>
                    <div className="border border-black/10 dark:border-white/10 rounded-2xl p-4 bg-black/[0.02] dark:bg-white/[0.02]">
                        <div style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{renderValue(result.real_behavior)}</div>
                    </div>
                </div>
            </motion.div>

            {/* ===== RELATIONSHIP SCENARIO ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="card-header">
                    <span className="material-symbols-outlined icon-primary">cycle</span>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_relationship_pattern')}</h3>
                </div>
                <div className="card-highlight" style={{ background: 'rgba(175, 82, 222, 0.05)', border: '1px solid rgba(175, 82, 222, 0.1)' }}>
                    <p style={{ margin: 0, fontWeight: '500', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                        {renderRelationshipPattern(result.relationship_pattern)}
                    </p>
                </div>
            </motion.div>

            {/* ===== ATTRACTION ===== */}
            <motion.div variants={item} className="card-glass">
                <h3 className="card-title-primary" style={{ color: '#FF2D55', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '6px', verticalAlign: 'middle' }}>favorite</span>
                    {t('rel_partner_attraction')}
                </h3>
                <p className="card-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {renderPartnerAttraction(result.partner_attraction)}
                </p>
            </motion.div>

            {/* ===== MASK VS REALITY ===== */}
            <PremiumGate isPaid={result.isPaid} title={t('rel_mask_vs_reality')}>
                <motion.div variants={item} className="card-glass my-4">
                    <div className="card-header pb-4 mb-4">
                        <span className="material-symbols-outlined" style={{ color: '#AF52DE' }}>masks</span>
                        <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_mask_vs_reality')}</h3>
                    </div>

                    {result.mask_vs_reality && (
                        <div className="px-1 py-2">
                            <div className="flex flex-col items-center mb-6 relative">
                                <div className="text-[10px] font-bold tracking-widest text-[#AF52DE] uppercase mb-3 opacity-80">{t('rel_mask')}</div>
                                <div className="bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl rounded-[24px] px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] w-full text-center border border-black/5 dark:border-white/5">
                                    <div className="font-medium text-[16px] text-[var(--text)]">{formatCamelCase(result.mask_vs_reality.mask)}</div>
                                </div>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] opacity-60">arrow_downward</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center mt-6 relative">
                                <div className="text-[10px] font-bold tracking-widest text-[#AF52DE] uppercase mb-3 opacity-80">{t('rel_reality')}</div>
                                <div className="bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl rounded-[24px] px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] w-full text-center border border-black/5 dark:border-white/5">
                                    <div className="font-medium text-[16px] text-[var(--text)]">{formatCamelCase(result.mask_vs_reality.reality)}</div>
                                </div>
                            </div>

                            <div className="mt-8 bg-gradient-to-br from-[#FF2D55]/10 to-[#FF2D55]/5 rounded-[24px] p-5 shadow-sm text-center">
                                <div className="text-[10px] font-bold tracking-widest text-[#FF2D55] uppercase mb-1 opacity-80">{t('rel_gap')}</div>
                                <div className="font-semibold text-[15px] text-[#FF2D55] mb-4">{formatCamelCase(result.mask_vs_reality.gap)}</div>

                                <div className="w-8 h-[1px] bg-[#FF2D55]/20 mx-auto mb-3"></div>

                                <div className="text-[10px] font-bold tracking-widest text-[#FF2D55] uppercase mb-1 opacity-60">{t('rel_cost')}</div>
                                <div className="text-[14px] text-[var(--text)] opacity-80 leading-relaxed">{formatCamelCase(result.mask_vs_reality.cost)}</div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </PremiumGate>

            {/* ===== AWARENESS ===== */}
            {result.awareness && (
                <motion.div variants={item} className="card-glass">
                    <div className="card-header pb-4">
                        <span className="material-symbols-outlined icon-primary">visibility</span>
                        <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_awareness')}</h3>
                    </div>

                    <div className="strength-chart-box mb-4" style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
                        <div className="strength-bar-row">
                            <div className="strength-bar-info">
                                <span className="strength-bar-label" style={{ fontSize: '13px', textTransform: 'uppercase', color: '#AF52DE', fontWeight: 'bold' }}>
                                    {renderValue(result.awareness.level_text || result.awareness.level)}
                                </span>
                                <span className="strength-bar-value" style={{ color: '#AF52DE', fontWeight: '800' }}>
                                    {parseInt(result.awareness.level_percent || result.awareness.level) || 50}%
                                </span>
                            </div>
                            <div className="strength-bar-bg" style={{ background: 'rgba(175, 82, 222, 0.1)', overflow: 'hidden', borderRadius: '99px' }}>
                                <motion.div
                                    className="strength-bar-fill"
                                    style={{ background: 'linear-gradient(90deg, #AF52DE, #D08DF0)' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${parseInt(result.awareness.level_percent || result.awareness.level) || 50}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                        </div>
                    </div>

                    <p className="card-text italic text-[var(--text-muted)] text-[14px] leading-relaxed">
                        {renderValue(result.awareness.description)}
                    </p>
                </motion.div>
            )}

            {/* ===== CONFIDENCE ===== */}
            {result.confidence && (
                <motion.div variants={item} className="card-glass my-4">
                    <div className="card-header pb-2">
                        <span className="material-symbols-outlined icon-primary">analytics</span>
                        <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('analysis_confidence')}</h3>
                    </div>
                    <p className="card-text text-[14px] font-medium leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                        {result.confidence}
                    </p>
                </motion.div>
            )}

            {/* ===== КНОПКА ===== */}
            <motion.div variants={item} className="result-footer mt-6">
                <button onClick={onReset} className="btn-gradient" style={{ background: 'linear-gradient(135deg, #AF52DE 0%, #007AFF 100%)', boxShadow: '0 8px 24px rgba(175, 82, 222, 0.3)' }}>
                    <span className="material-symbols-outlined">restart_alt</span>
                    {t('new_analysis')}
                </button>
            </motion.div>
        </motion.div>
    );
}
