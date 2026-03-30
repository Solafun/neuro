import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer
} from 'recharts';
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

const parseScore = (val) => {
    if (typeof val === 'number') return Math.min(100, Math.max(0, val));
    if (typeof val === 'string') {
        const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 50 : Math.min(100, Math.max(0, num));
    }
    return 50;
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
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) {
        const cleaned = val.map(v => typeof v === 'string' ? v.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\uafff]/g, '').trim() : v).filter(Boolean);
        return cleaned.length > 0 ? cleaned.join(', ') : fallback;
    }
    return fallback;
};

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

export default function ResultScreen({ result, onReset }) {
    const { t } = useI18n();
    if (!result) return null;

    const personalityData = [
        { subject: t('logic'), value: parseScore(result.personality_scores?.logic), fullMark: 100 },
        { subject: t('emotionality'), value: parseScore(result.personality_scores?.emotionality), fullMark: 100 },
        { subject: t('control'), value: parseScore(result.personality_scores?.control), fullMark: 100 },
        { subject: t('adaptability'), value: parseScore(result.personality_scores?.adaptability), fullMark: 100 },
        { subject: t('awareness'), value: parseScore(result.personality_scores?.awareness), fullMark: 100 },
    ];

    const socialData = [
        { subject: t('empathy'), value: parseScore(result.social_scores?.empathy), fullMark: 100 },
        { subject: t('openness'), value: parseScore(result.social_scores?.openness), fullMark: 100 },
        { subject: t('trust'), value: parseScore(result.social_scores?.trust), fullMark: 100 },
        { subject: t('toxicity'), value: parseScore(result.social_scores?.toxicity), fullMark: 100 },
        { subject: t('manipulation'), value: parseScore(result.social_scores?.manipulation), fullMark: 100 },
    ];

    // Показываем 3-4 эмоции (сколько пришло, без прочерков)
    const coreEmotions = (result.emotional_profile?.core_emotions || []).filter(e => e && e !== '—');
    const displayEmotions = coreEmotions.length > 0 ? coreEmotions.slice(0, 4) : ['—', '—', '—'];

    const emotionTagColors = ['tag-primary', 'tag-success', 'tag-warning', 'tag-purple'];

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
                            background: result.aura?.color || 'var(--primary)',
                            opacity: 0.6
                        }}
                    />
                    <div
                        className="avatar-ring"
                        style={{
                            background: result.aura?.color
                                ? `linear-gradient(135deg, ${result.aura.color} 0%, #ffffff 100%)`
                                : 'linear-gradient(135deg, var(--primary) 0%, #00D4FF 100%)',
                            boxShadow: result.aura?.color
                                ? `0 0 50px ${result.aura.color}99`
                                : '0 8px 32px rgba(0, 122, 255, 0.3)'
                        }}
                    >
                        <div className="avatar-inner">
                            <div
                                className="avatar-image"
                                style={{
                                    backgroundImage: `url(${result.avatar || `https://ui-avatars.com/api/?name=${result.nickname}&background=007AFF&color=fff&size=96`})`
                                }}
                            />
                        </div>
                    </div>
                </div>
                <h1 className="result-nickname">@{result.nickname}</h1>
                <p className="result-subtitle">{t('psychological_profile')}</p>
                <div className="result-psychotype-wrapper">
                    <div className="result-psychotype">
                        {(typeof result.profile_summary === 'object' ? result.profile_summary.psychotype : result.profile_summary) || 'Analysis Complete'}
                    </div>
                </div>
            </motion.header>

            {/* ===== ВЕРДИКТ СИСТЕМЫ ===== */}
            <motion.section variants={item} className="card-dark">
                <div className="card-header-dark">
                    <span className="material-symbols-outlined icon-primary">terminal</span>
                    <h3>{t('system_verdict')}</h3>
                </div>
                <div className="verdict-quote">
                    <p>"{renderValue(result.system_verdict?.truth_bomb, t('truth_bomb_placeholder'))}"</p>
                </div>
                <div className="verdict-details">
                    <div className="verdict-item">
                        <h4 className="verdict-label-primary">
                            <span className="material-symbols-outlined">bolt</span>
                            {t('main_conflict')}
                        </h4>
                        <p>{renderValue(result.system_verdict?.main_conflict)}</p>
                    </div>
                    <div className="verdict-item">
                        <h4 className="verdict-label-danger">
                            <span className="material-symbols-outlined">warning</span>
                            {t('self_sabotage')}
                        </h4>
                        <p>{renderValue(result.system_verdict?.self_sabotage)}</p>
                    </div>
                </div>
            </motion.section>

            {/* ===== ОБЩИЙ ПРОФИЛЬ ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="card-header">
                    <span className="material-symbols-outlined icon-primary">summarize</span>
                    <h3>{t('general_profile')}</h3>
                </div>
                <p className="card-text">
                    {renderValue(result.profile_summary?.summary || result.profile_summary, t('profile_summary_placeholder'))}
                </p>
                {result.profile_summary?.core_pattern && (
                    <div className="card-highlight">
                        <span className="card-highlight-label">{t('core_pattern')}</span>
                        <p>{result.profile_summary.core_pattern}</p>
                    </div>
                )}
            </motion.div>

            {/* ===== СЕКЦИЯ: МЫШЛЕНИЕ ===== */}
            <motion.div variants={item} className="section-divider">
                <h2>{t('thinking_section')}</h2>
                <p>{t('thinking_subtitle')}</p>
            </motion.div>

            {/* Матрица личности */}
            <PremiumGate isPaid={result.isPaid} title={t('personality_matrix')}>
                <motion.div variants={item} className="card-glass">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-primary">insights</span>
                        <h3>{t('personality_matrix')}</h3>
                    </div>
                    <div className="radar-container">
                        <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50}>
                            <RadarChart cx="50%" cy="50%" outerRadius="55%" data={personalityData}>
                                <PolarGrid stroke="#d1e3fbff" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                />
                                <Radar
                                    dataKey="value"
                                    stroke="#007AFF"
                                    strokeWidth={2}
                                    fill="#007AFF"
                                    fillOpacity={0.25}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="scores-grid scores-grid-5 scores-blue">
                        {personalityData.map((d, i) => (
                            <div key={i} className="score-item score-item-blue">
                                <span className="score-value">{d.value}%</span>
                                <span className="score-label">{d.subject}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </PremiumGate>

            {/* Логика решений */}
            <motion.div variants={item} className="card-glass">
                <h3 className="card-title-primary">{t('decision_logic')}</h3>
                <p className="card-text">
                    {renderValue(result.cognitive_profile?.decision_logic)}
                </p>
            </motion.div>

            {/* Слепые зоны и Искажения */}
            <PremiumGate isPaid={result.isPaid} title={t('hidden_mechanisms')} compact={true}>
                <motion.div variants={item} className="cards-row">
                    <div className="card-danger">
                        <div className="card-header-mini">
                            <span className="material-symbols-outlined icon-danger">visibility_off</span>
                            <span className="card-label-inline">{t('blind_spots')}</span>
                        </div>
                        {Array.isArray(result.cognitive_profile?.blind_spots) ? (
                            <ul className="bullet-list" style={{ marginTop: '8px' }}>
                                {result.cognitive_profile.blind_spots.slice(0, 3).map((item, i) => (
                                    <li key={i}>
                                        <span className="bullet" style={{ background: 'var(--danger)' }} />
                                        <span>{formatCamelCase(item)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="card-text-compact">{renderValue(result.cognitive_profile?.blind_spots)}</p>
                        )}
                    </div>
                    <div className="card-glass">
                        <h3 className="card-mini-title">{t('biases')}</h3>
                        <ul className="bullet-list">
                            {(result.cognitive_profile?.biases || []).slice(0, 3).map((bias, i) => (
                                <li key={i}>
                                    <span className="bullet" />
                                    <span>{formatCamelCase(bias)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            </PremiumGate>

            {/* ===== СЕКЦИЯ: СИЛЬНАЯ СТОРОНА ===== */}
            <motion.div variants={item} className="section-divider mb-4">
                <h2>{t('strengths_section')}</h2>
                <p>{t('strengths_subtitle')}</p>
            </motion.div>

            {/* ГРАФИК СИЛЬНЫХ СТОРОН */}
            <motion.div variants={item} className="strength-chart-box">
                {(result.positive_core?.strength_chart || []).map((strength, i) => (
                    <div key={i} className="strength-bar-row">
                        <div className="strength-bar-info">
                            <span className="strength-bar-label">{strength.name}</span>
                            <span className="strength-bar-value">{strength.value}%</span>
                        </div>
                        <div className="strength-bar-bg">
                            <motion.div
                                className="strength-bar-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${strength.value}%` }}
                                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                            />
                        </div>
                    </div>
                ))}
            </motion.div>

            <motion.div variants={item} className="card-glass">
                <div className="card-header">
                    <span className="material-symbols-outlined icon-success">auto_awesome</span>
                    <h3>{t('your_talents')}</h3>
                </div>

                <div className="plan-section">
                    <span className="plan-label success">{t('natural_strength')}</span>
                    <p className="card-text">{renderValue(result.positive_core?.natural_strengths)}</p>
                </div>

                <div className="plan-quote">
                    <span className="plan-quote-label">{t('where_it_works')}:</span>
                    {renderValue(result.positive_core?.real_world_value)}
                </div>

                <div className="plan-success-bubble">
                    {renderValue(result.positive_core?.unique_trait)}
                </div>
            </motion.div>

            {/* ===== СЕКЦИЯ: ЭМОЦИИ ===== */}
            <motion.div variants={item} className="section-divider">
                <h2>{t('emotions_section')}</h2>
                <p>{t('emotions_subtitle')}</p>
            </motion.div>

            {/* Стресс и Регуляция */}
            <motion.div variants={item} className="cards-row">
                <div className="card-glass">
                    <div className="card-header-mini">
                        <span className="material-symbols-outlined icon-primary">bolt</span>
                        <span className="card-label-inline">{t('stress')}</span>
                    </div>
                    <p className="card-text-compact">{renderValue(result.emotional_profile?.stress_response)}</p>
                </div>
                <div className="card-glass">
                    <div className="card-header-mini">
                        <span className="material-symbols-outlined icon-primary">self_improvement</span>
                        <span className="card-label-inline">{t('regulation')}</span>
                    </div>
                    <p className="card-text-compact">{renderValue(result.emotional_profile?.regulation)}</p>
                </div>
            </motion.div>

            {/* Паттерны поведения */}
            <motion.div variants={item} className="card-glass">
                <h3 className="card-mini-title">{t('behavior_patterns')}</h3>
                <div className="patterns-list-simple">
                    {(result.behavior_profile?.patterns || []).slice(0, 4).map((pattern, i) => (
                        <div key={i} className="pattern-item-simple">
                            <span className="pattern-bullet" />
                            <span>
                                {typeof pattern === 'object'
                                    ? Object.values(pattern).join(' → ')
                                    : String(pattern)}
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Базовые эмоции — ЦЕНТРИРОВАНО */}
            <PremiumGate isPaid={result.isPaid} title={t('emotional_spectrum')} compact={true}>
                <motion.div variants={item} className="card-glass">
                    <h3 className="card-mini-title">{t('core_emotions')}</h3>
                    <div className="tags-row-centered">
                        {displayEmotions.map((emotion, i) => (
                            <span key={i} className={`tag ${emotionTagColors[i % emotionTagColors.length]}`}>
                                {emotion.toUpperCase()}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </PremiumGate>

            {/* ===== СЕКЦИЯ: ТЁМНАЯ СТОРОНА ===== */}
            <motion.div variants={item} className="section-divider">
                <h2>{t('dark_side_section')}</h2>
                <p>{t('dark_side_subtitle')}</p>
            </motion.div>

            {/* Теневой профиль — ШИРОКИЙ В КРАСНОМ СТИЛЕ */}
            <PremiumGate isPaid={result.isPaid} title={t('shadow_profile')}>
                <motion.div variants={item} className="card-glass card-shadow-red">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-danger">mist</span>
                        <h3>{t('shadow_profile')}</h3>
                    </div>
                    <div className="radar-container radar-red">
                        <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50}>
                            <RadarChart cx="50%" cy="50%" outerRadius="55%" data={socialData}>
                                <PolarGrid stroke="#fecaca" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: '#991b1b', fontSize: 10, fontWeight: 700 }}
                                />
                                <Radar
                                    dataKey="value"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    fill="#ef4444"
                                    fillOpacity={0.25}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="scores-grid scores-grid-5 scores-red">
                        {socialData.map((d, i) => (
                            <div key={i} className="score-item score-item-red">
                                <span className="score-value">{d.value}%</span>
                                <span className="score-label">{d.subject}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </PremiumGate>

            {/* Социальная динамика */}
            <PremiumGate isPaid={result.isPaid} title={t('social_dynamics')} compact={true}>
                <motion.div variants={item} className="card-glass">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-primary">groups</span>
                        <h3>{t('social_dynamics')}</h3>
                    </div>
                    <div className="metrics-list">
                        {[
                            { label: t('communication_style'), value: result.social_profile?.communication_style },
                            { label: t('attachment_type'), value: result.social_profile?.attachment },
                            { label: t('trust'), value: result.social_profile?.trust_issues },
                        ].map((row, i) => (
                            <div key={i} className="metric-row">
                                <span className="metric-label">{row.label}</span>
                                <span className="metric-value">{renderValue(row.value)}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </PremiumGate>

            {/* ===== СЕКЦИЯ: РОСТ ===== */}
            <motion.div variants={item} className="section-divider">
                <h2>{t('growth_section')}</h2>
                <p>{t('growth_subtitle')}</p>
            </motion.div>

            {/* Силы и Риски */}
            <motion.div variants={item} className="cards-row">
                <div className="card-success">
                    <h4>{t('strengths')}</h4>
                    <ul>
                        {(result.positive_core?.strengths || []).slice(0, 4).map((s, i) => (
                            <li key={i}>
                                <span className="material-symbols-outlined">star</span>
                                <span>{s}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="card-danger-light">
                    <h4>{t('risks')}</h4>
                    <ul>
                        {(result.weak_zones?.risks || []).slice(0, 3).map((r, i) => (
                            <li key={i}>
                                <span className="material-symbols-outlined">warning</span>
                                <span>{formatCamelCase(r)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </motion.div>

            {/* План развития */}
            <PremiumGate isPaid={result.isPaid} title={t('development_plan')} compact={true}>
                <motion.div variants={item} className="card-glass">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-success">trending_up</span>
                        <h3>{t('development_plan')}</h3>
                    </div>

                    {result.development_plan?.growth_points?.length > 0 && (
                        <div className="plan-section">
                            <span className="plan-label success">{t('breakthrough_points')}</span>
                            <ul className="plan-list">
                                {result.development_plan.growth_points.slice(0, 4).map((point, i) => (
                                    <li key={i}>
                                        <span className="plan-dot" />
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.development_plan?.what_to_change && (
                        <div className="plan-quote">
                            <span className="plan-quote-label">{t('what_to_change')}:</span>
                            {result.development_plan.what_to_change}
                        </div>
                    )}

                    {result.development_plan?.what_happens_if_not && (
                        <div className="plan-warning">
                            <span className="plan-warning-label">{t('forecast')}:</span>
                            {result.development_plan.what_happens_if_not}
                        </div>
                    )}
                </motion.div>
            </PremiumGate>

            {/* Уязвимости */}
            <PremiumGate isPaid={result.isPaid} title={t('vulnerabilities')} compact={true}>
                <motion.div variants={item} className="card-glass card-border-danger">
                    <h3 className="card-mini-title">{t('vulnerabilities')}</h3>
                    <div className="vulnerabilities">
                        {result.weak_zones?.vulnerabilities?.length > 0 && (
                            <div>
                                <span className="vuln-label">{t('zones')}</span>
                                <p>{result.weak_zones.vulnerabilities.map(formatCamelCase).join(', ')}</p>
                            </div>
                        )}
                        {result.weak_zones?.triggers?.length > 0 && (
                            <div>
                                <span className="vuln-label">{t('triggers')}</span>
                                <p>{result.weak_zones.triggers.map(formatCamelCase).join(', ')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </PremiumGate>

            {/* Уверенность анализа — В СТИЛЕ ЛОГИКИ РЕШЕНИЙ */}
            {result.confidence && (
                <motion.div variants={item} className="card-glass">
                    <h3 className="card-title-primary">{t('analysis_confidence')}</h3>
                    <p className="card-text">
                        {result.confidence}
                    </p>
                </motion.div>
            )}

            {/* ===== КНОПКА ===== */}
            <motion.div variants={item} className="result-footer">
                <button onClick={onReset} className="btn-gradient">
                    <span className="material-symbols-outlined">analytics</span>
                    {t('new_analysis')}
                </button>
            </motion.div>
        </motion.div>
    );
}