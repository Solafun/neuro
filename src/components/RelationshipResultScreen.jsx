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
    if (!text) return '—';
    const cleanText = renderValue(text);
    const parts = cleanText.split(/(Инсайт:|Insight:)/i);
    if (parts.length > 1) {
        return (
            <>
                <span>{parts[0]}</span>
                <br /><br />
                <span className="font-bold text-[var(--danger)]">{parts[1]} </span>
                <span>{parts.slice(2).join('')}</span>
            </>
        );
    }
    return cleanText;
};

const renderRelationshipPattern = (text) => {
    if (!text) return '—';
    const cleanText = renderValue(text);

    // Highlight specific keywords in the pattern
    const regex = /(Начало:|Развитие:|Итог:|Beginning:|Development:|Outcome:)/gi;
    const parts = cleanText.split(regex);

    return parts.map((part, i) => {
        if (part.match(/Начало:|Beginning:/i)) return <span key={i} className="text-blue-500 font-bold">{part}</span>;
        if (part.match(/Развитие:|Development:/i)) return <span key={i} className="text-orange-500 font-bold">{part}</span>;
        if (part.match(/Итог:|Outcome:/i)) return <span key={i} className="text-green-500 font-bold">{part}</span>;
        return <span key={i}>{part}</span>;
    });
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
                    <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{t('rel_truth_bomb')}</h3>
                </div>
                <p className="card-text text-[15px] font-medium leading-[1.6]" style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.9)' }}>
                    {renderValue(result.truth_bomb)}
                </p>
            </motion.section>

            {/* ===== IDEAL SELF vs REALITY ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="plan-section mb-6">
                    <span className="plan-label success mb-2 flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[16px]">hotel_class</span>
                        {t('rel_ideal_self')}
                    </span>
                    <p className="card-text-compact text-[14px]" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{renderValue(result.ideal_self)}</p>
                </div>

                <div className="w-full h-[1px] bg-black/5 mb-5"></div>

                <div className="plan-section">
                    <span className="plan-label danger mb-2 flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[16px]">movie_info</span>
                        {t('rel_real_behavior')}
                    </span>
                    <p className="card-text-compact text-[14px]" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{renderValue(result.real_behavior)}</p>
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
                <motion.div variants={item} className="card-glass my-4 border-[rgba(175,82,222,0.2)] shadow-md">
                    <div className="card-header justify-center border-b border-black/5 pb-4 mb-4">
                        <span className="material-symbols-outlined" style={{ color: '#AF52DE' }}>masks</span>
                        <h3 className="text-center">{t('rel_mask_vs_reality')}</h3>
                    </div>

                    {result.mask_vs_reality && (
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">{t('rel_mask')}</span>
                                <div className="px-4 py-2 bg-black/10 rounded-xl font-medium text-[14px] leading-snug">{formatCamelCase(result.mask_vs_reality.mask)}</div>
                            </div>

                            <div className="w-[2px] h-[15px] bg-[var(--primary)] opacity-30"></div>

                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">{t('rel_reality')}</span>
                                <div className="px-4 py-2 bg-black/10 rounded-xl font-medium text-[14px] leading-snug">{formatCamelCase(result.mask_vs_reality.reality)}</div>
                            </div>

                            <div className="w-[2px] h-[15px] bg-[var(--danger)] opacity-30"></div>

                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-[var(--danger)] uppercase tracking-wider font-bold mb-1">{t('rel_gap')}</span>
                                <div className="px-4 py-2 bg-[rgba(255,45,85,0.1)] rounded-xl font-medium text-[14px] leading-snug">{formatCamelCase(result.mask_vs_reality.gap)}</div>
                            </div>

                            <div className="w-[2px] h-[15px] bg-[var(--text-muted)] opacity-30"></div>

                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">{t('rel_cost')}</span>
                                <div className="px-4 py-2 bg-black/5 rounded-xl font-medium text-[14px] leading-snug">{formatCamelCase(result.mask_vs_reality.cost)}</div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </PremiumGate>

            {/* ===== AWARENESS ===== */}
            {result.awareness && (
                <motion.div variants={item} className="card-glass">
                    <div className="card-header border-b border-black/5 pb-3">
                        <span className="material-symbols-outlined icon-primary">visibility</span>
                        <h3>{t('rel_awareness')} — <span style={{ color: '#AF52DE' }}>{renderValue(result.awareness.level_text || result.awareness.level).toUpperCase()}</span></h3>
                    </div>

                    <div className="mt-4 mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-mono text-[16px] tracking-wider text-[var(--text)] text-opacity-80">
                                <span className="mr-1 opacity-50">[</span>
                                <span style={{ color: '#AF52DE' }}>
                                    {'█'.repeat(Math.round((parseInt(result.awareness.level_percent || result.awareness.level) || 50) / 10))}
                                </span>
                                <span style={{ color: 'rgba(175, 82, 222, 0.2)' }}>
                                    {'░'.repeat(10 - Math.round((parseInt(result.awareness.level_percent || result.awareness.level) || 50) / 10))}
                                </span>
                                <span className="ml-1 opacity-50">]</span>
                            </div>
                            <span className="font-bold text-[18px]" style={{ color: '#AF52DE' }}>
                                {parseInt(result.awareness.level_percent || result.awareness.level) || 50}%
                            </span>
                        </div>
                    </div>

                    <p className="card-text mt-3 italic text-[var(--text-muted)] text-[14px]">
                        {renderValue(result.awareness.description)}
                    </p>
                </motion.div>
            )}

            {/* ===== CONFIDENCE ===== */}
            {result.confidence && (
                <motion.div variants={item} className="card-glass my-4">
                    <div className="card-header border-b border-black/5 pb-3">
                        <span className="material-symbols-outlined icon-primary">analytics</span>
                        <h3>{t('analysis_confidence')}</h3>
                    </div>
                    <p className="card-text mt-3 text-[14px] font-medium" style={{ whiteSpace: 'pre-wrap' }}>
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
