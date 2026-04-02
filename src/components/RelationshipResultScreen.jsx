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
                    <div className="mt-4 w-full px-4">
                        <button
                            onClick={handleShare}
                            className="bg-black/5 hover:bg-black/10 text-[var(--text)] text-sm font-bold py-3 px-6 rounded-full w-full transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">share</span>
                            "{renderValue(result.share_hook)}"
                        </button>
                    </div>
                )}
            </motion.header>

            {/* ===== TRUTH BOMB ===== */}
            <motion.section variants={item} className="card-dark" style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2A1B38 100%)' }}>
                <div className="card-header-dark">
                    <span className="material-symbols-outlined icon-primary" style={{ color: '#AF52DE' }}>terminal</span>
                    <h3>{t('truth_bomb_placeholder')}</h3>
                </div>
                <div className="verdict-quote" style={{ borderLeftColor: '#AF52DE' }}>
                    <p>"{renderValue(result.truth_bomb)}"</p>
                </div>
            </motion.section>

            {/* ===== IDEAL SELF vs REALITY ===== */}
            <motion.div variants={item} className="cards-row">
                <div className="card-glass">
                    <div className="card-header-mini">
                        <span className="material-symbols-outlined icon-primary">hotel_class</span>
                        <span className="card-label-inline">{t('rel_ideal_self')}</span>
                    </div>
                    <p className="card-text-compact">{renderValue(result.ideal_self)}</p>
                </div>
                <div className="card-glass">
                    <div className="card-header-mini">
                        <span className="material-symbols-outlined icon-danger">movie_info</span>
                        <span className="card-label-inline">{t('rel_real_behavior')}</span>
                    </div>
                    <p className="card-text-compact">{renderValue(result.real_behavior)}</p>
                </div>
            </motion.div>

            {/* ===== RELATIONSHIP SCENARIO ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="card-header">
                    <span className="material-symbols-outlined icon-primary">cycle</span>
                    <h3>{t('rel_relationship_pattern')}</h3>
                </div>
                <div className="card-highlight" style={{ background: 'rgba(175, 82, 222, 0.08)' }}>
                    <p style={{ margin: 0, fontWeight: '500', lineHeight: '1.6' }}>{renderValue(result.relationship_pattern)}</p>
                </div>
            </motion.div>

            {/* ===== ATTRACTION ===== */}
            <motion.div variants={item} className="card-glass">
                <h3 className="card-title-primary" style={{ color: '#FF2D55' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '6px', verticalAlign: 'middle' }}>favorite</span>
                    {t('rel_partner_attraction')}
                </h3>
                <p className="card-text">
                    {renderValue(result.partner_attraction)}
                </p>
            </motion.div>

            {/* ===== MASK VS REALITY ===== */}
            <PremiumGate isPaid={result.isPaid} title={t('rel_mask_vs_reality')}>
                <motion.div variants={item} className="card-glass shadow-md border-[rgba(175,82,222,0.2)]">
                    <div className="card-header">
                        <span className="material-symbols-outlined" style={{ color: '#AF52DE' }}>masks</span>
                        <h3>{t('rel_mask_vs_reality')}</h3>
                    </div>

                    {result.mask_vs_reality && (
                        <div className="metrics-list mt-2">
                            <div className="metric-row border-b border-black/5 pb-3">
                                <span className="metric-label font-bold text-[var(--text-muted)] text-[11px] uppercase">{t('rel_mask')}</span>
                                <span className="metric-value font-semibold text-[14px]">{renderValue(result.mask_vs_reality.mask)}</span>
                            </div>
                            <div className="metric-row border-b border-black/5 py-3">
                                <span className="metric-label font-bold text-[var(--text-muted)] text-[11px] uppercase">{t('rel_reality')}</span>
                                <span className="metric-value font-semibold text-[14px]">{renderValue(result.mask_vs_reality.reality)}</span>
                            </div>
                            <div className="metric-row border-b border-black/5 py-3">
                                <span className="metric-label text-[var(--danger)] font-bold text-[11px] uppercase">{t('rel_gap')}</span>
                                <span className="metric-value font-semibold text-[14px]">{renderValue(result.mask_vs_reality.gap)}</span>
                            </div>
                            <div className="metric-row pt-3">
                                <span className="metric-label font-bold text-[var(--text-muted)] text-[11px] uppercase">{t('rel_cost')}</span>
                                <span className="metric-value font-semibold text-[14px]">{renderValue(result.mask_vs_reality.cost)}</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            </PremiumGate>

            {/* ===== AWARENESS ===== */}
            {result.awareness && (
                <motion.div variants={item} className="card-glass">
                    <h3 className="card-mini-title flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        {t('rel_awareness')} — {renderValue(result.awareness.level).toUpperCase()}
                    </h3>
                    <p className="card-text-compact mt-2">
                        {renderValue(result.awareness.description)}
                    </p>
                </motion.div>
            )}

            {/* ===== CONFIDENCE ===== */}
            {result.confidence && (
                <motion.div variants={item} className="mt-4 text-center">
                    <p className="text-[12px] text-[var(--text-muted)] font-medium opacity-60">
                        {t('analysis_confidence')}: {result.confidence}
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
