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

    if (parts.length === 1) return <div style={{ fontSize: '15px', lineHeight: '1.6' }}>{cleanText}</div>;

    const beforeInsight = parts[0].trim();
    const insightKeyword = parts[1];
    const insightText = parts.slice(2).join('').trim();

    return (
        <div className="flex flex-col gap-4">
            {beforeInsight && <div style={{ fontSize: '15px', lineHeight: '1.6' }}>{beforeInsight}</div>}
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
                    color = '#1378e4ff';
                    bulletColor = 'bg-[#007AFF]';
                } else if (/Развитие:|Development:/i.test(line)) {
                    color = '#d27728ff'; // Darker orange
                    bulletColor = 'bg-[#E67E22]';
                } else if (/Итог:|Outcome:/i.test(line)) {
                    color = '#169e48ff'; // Greener green
                    bulletColor = 'bg-[#16A34A]';
                }

                const parts = line.split(/(Начало:|Развитие:|Итог:|Beginning:|Development:|Outcome:)/i);
                if (parts.length > 2) {
                    return (
                        <div key={i} className="flex gap-3 items-start mb-3">
                            <div className={`mt-[6px] w-[7px] h-[7px] rounded-full shrink-0 ${bulletColor} shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}></div>
                            <div style={{ color: color, fontSize: '15px', lineHeight: '1.6', flex: 1, paddingLeft: '4px' }}>
                                <strong style={{ letterSpacing: '0.2px' }}>{parts[1]}</strong><span className="ml-1">{parts.slice(2).join('')}</span>
                            </div>
                        </div>
                    );
                }
                return (
                    <div key={i} className="flex gap-3 items-start mb-3">
                        <div className={`mt-[6px] w-[7px] h-[7px] rounded-full shrink-0 ${bulletColor} shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}></div>
                        <div style={{ color: color, fontSize: '15px', lineHeight: '1.6', flex: 1, paddingLeft: '4px' }}>{line}</div>
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
                <p className="result-subtitle">{t('psychological_profile')}</p>

                {result.share_hook && (
                    <div className="result-psychotype-wrapper cursor-pointer mt-4 mb-2" onClick={handleShare}>
                        <div className="result-psychotype flex items-center justify-center gap-2 px-5 py-3" style={{ background: '#1C1C1E', color: 'white', textTransform: 'none' }}>
                            <span className="material-symbols-outlined text-[16px]" style={{ color: '#AF52DE' }}>share</span>
                            <span className="font-medium italic text-white text-[14px]">{renderValue(result.share_hook)}</span>
                        </div>
                    </div>
                )}
            </motion.header>

            {/* ===== TRUTH BOMB ===== */}
            <motion.section variants={item} className="card-dark" style={{ marginBottom: '24px' }}>
                <div className="card-header-dark">
                    <span className="material-symbols-outlined icon-primary" style={{ color: '#AF52DE' }}>terminal</span>
                    <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{t('rel_truth_bomb')}</h3>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', color: 'white', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                    {renderValue(result.truth_bomb)}
                </p>
            </motion.section>

            {/* ===== IDEAL SELF vs REALITY ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="card-header pb-2">
                    <span className="material-symbols-outlined icon-primary" style={{ color: '#AF52DE' }}>compare_arrows</span>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_ideal_vs_real')}</h3>
                </div>

                <div className="plan-section mt-4 mb-6">
                    <span className="text-[13px] font-black uppercase text-[#16A34A] tracking-wider mb-2 flex items-center gap-1.5 w-fit">
                        {t('rel_ideal_self')}
                    </span>
                    <div className="plan-success-bubble text-[15px] leading-relaxed">
                        {renderValue(result.ideal_self)}
                    </div>
                </div>

                <div className="plan-section mt-2 mb-2">
                    <span className="text-[13px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-2 flex items-center gap-1.5 w-fit">
                        {t('rel_real_behavior')}
                    </span>
                    <div className="plan-quote text-[15px] leading-relaxed">
                        <div style={{ whiteSpace: 'pre-wrap' }}>{renderValue(result.real_behavior)}</div>
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
                    <div style={{ margin: 0, fontWeight: '500', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                        {renderRelationshipPattern(result.relationship_pattern)}
                    </div>
                </div>
            </motion.div>

            {/* ===== ATTRACTION ===== */}
            <motion.div variants={item} className="card-glass">
                <h3 className="card-mini-title" style={{ color: '#FF2D55' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px', verticalAlign: 'middle' }}>favorite</span>
                    {t('rel_partner_attraction')}
                </h3>
                <div style={{ fontSize: '15px', lineHeight: '1.6', opacity: 0.9 }}>
                    {renderPartnerAttraction(result.partner_attraction)}
                </div>
            </motion.div>

            {/* ===== MASK VS REALITY OVERHAUL ===== */}
            <PremiumGate isPaid={result.isPaid} title={t('rel_mask_vs_reality')}>
                <motion.div variants={item} className="card-glass my-4">
                    <div className="card-header pb-4 mb-6">
                        <span className="material-symbols-outlined" style={{ color: '#AF52DE' }}>webhook</span>
                        <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_mask_vs_reality')}</h3>
                    </div>

                    {result.mask_vs_reality && (
                        <div className="flex flex-col">
                            {/* Step 1: Mask */}
                            <div className="plan-section mb-10">
                                <span className="text-[13px] font-black uppercase text-[#AF52DE] tracking-wider mb-2 flex items-center gap-1.5 w-fit">
                                    {t('rel_mask')}
                                </span>
                                <div className="plan-success-bubble" style={{ background: 'rgba(175, 82, 222, 0.08)', color: 'var(--text)', border: '1px solid rgba(175, 82, 222, 0.15)', fontSize: '15px', borderRadius: '18px' }}>
                                    {formatCamelCase(result.mask_vs_reality.mask)}
                                </div>
                            </div>

                            {/* Step 2: Reality */}
                            <div className="plan-section mb-10">
                                <span className="text-[13px] font-black uppercase text-[#AF52DE] tracking-wider mb-2 flex items-center gap-1.5 w-fit">
                                    {t('rel_reality')}
                                </span>
                                <div className="plan-success-bubble" style={{ background: 'rgba(142, 142, 147, 0.08)', color: 'var(--text)', border: '1px solid rgba(142, 142, 147, 0.15)', fontSize: '15px', borderRadius: '18px' }}>
                                    {formatCamelCase(result.mask_vs_reality.reality)}
                                </div>
                            </div>

                            {/* Step 3: Gap */}
                            <div className="plan-section mb-10">
                                <span className="text-[13px] font-black uppercase text-[#FF2D55] tracking-wider mb-2 flex items-center gap-1.5 w-fit">
                                    {t('rel_gap')}
                                </span>
                                <div className="plan-success-bubble" style={{ background: 'rgba(255, 45, 85, 0.04)', color: '#FF2D55', border: '1px solid rgba(255, 45, 85, 0.1)', fontSize: '15px', borderRadius: '18px' }}>
                                    {formatCamelCase(result.mask_vs_reality.gap)}
                                </div>
                            </div>

                            {/* Step 4: Cost */}
                            <div className="plan-section">
                                <span className="text-[13px] font-black uppercase text-[#FF2D55] tracking-wider mb-2 flex items-center gap-1.5 w-fit">
                                    {t('rel_cost')}
                                </span>
                                <div className="plan-success-bubble" style={{ background: 'rgba(255, 45, 85, 0.08)', color: '#FF2D55', border: '1px solid rgba(255, 45, 85, 0.15)', fontSize: '15px', borderRadius: '18px', fontWeight: '600' }}>
                                    {formatCamelCase(result.mask_vs_reality.cost)}
                                </div>
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

                    <div className="strength-chart-box mb-4" style={{ background: 'none', backgroundColor: 'transparent', padding: 0, boxShadow: 'none', border: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
                        <div className="strength-bar-row" style={{ background: 'none', backgroundColor: 'transparent' }}>
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

                    <p className="card-text italic text-[var(--text-muted)] text-[15px] leading-relaxed">
                        {renderValue(result.awareness.description)}
                    </p>
                </motion.div>
            )}

            {/* ===== RELATIONSHIP ARCHETYPE ===== */}
            {result.relationship_archetype && (
                <motion.div variants={item} className="card-glass my-4">
                    <div className="card-header pb-2">
                        <span className="material-symbols-outlined icon-primary" style={{ color: '#AF52DE' }}>stars</span>
                        <h3 style={{ textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>{t('rel_archetype_title')}</h3>
                    </div>
                    <div className="text-center py-4">
                        <h2 className="text-[20px] font-extrabold text-[var(--text)] mb-3 leading-tight">
                            {renderValue(result.relationship_archetype.type)}
                        </h2>
                        <div className="w-12 h-[2px] bg-[#AF52DE]/20 mx-auto mb-4"></div>
                        <p className="text-[15px] font-medium leading-relaxed px-2 text-[var(--text)] opacity-90">
                            {renderValue(result.relationship_archetype.description)}
                        </p>
                        <div className="mt-4 p-4 rounded-[18px] bg-[#AF52DE]/05 border border-[#AF52DE]/10 italic text-[14px] text-[var(--text-muted)]">
                            {renderValue(result.relationship_archetype.core_mechanism)}
                        </div>
                    </div>
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
