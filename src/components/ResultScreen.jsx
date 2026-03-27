import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';

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

// Хелпер для удаления китайских иероглифов и разделения слипшихся слов
const formatCamelCase = (text) => {
    if (typeof text !== 'string') return text;
    // Удаляем иероглифы (CJK Unified Ideographs)
    let cleanText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\uafff]/g, '').trim();
    // Разделяем CamelCase/PascalCase
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

const PremiumGate = ({ isPaid, children, title = "Раздел заблокирован", compact = false }) => {
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
                <h4 className="premium-title">{title}</h4>
                <p className="premium-text">
                    {compact
                        ? "Оформите подписку, чтобы разблокировать этот раздел."
                        : "Оформите подписку, чтобы разблокировать этот раздел и получить глубокий анализ личности."}
                </p>
                <button className="btn-unlock" onClick={() => window.Telegram?.WebApp?.openTelegramLink('https://t.me/tribute/app?startapp=sR0c')}>
                    ОТКРЫТЬ ДОСТУП
                </button>
            </div>
        </div>
    );
};

export default function ResultScreen({ result, onReset }) {
    if (!result) return null;

    const personalityData = [
        { subject: 'Логика', value: parseScore(result.personality_scores?.logic), fullMark: 100 },
        { subject: 'Эмоции', value: parseScore(result.personality_scores?.emotionality), fullMark: 100 },
        { subject: 'Контроль', value: parseScore(result.personality_scores?.control), fullMark: 100 },
        { subject: 'Адаптивность', value: parseScore(result.personality_scores?.adaptability), fullMark: 100 },
        { subject: 'Осознаность', value: parseScore(result.personality_scores?.awareness), fullMark: 100 },
    ];

    const socialData = [
        { subject: 'Эмпатия', value: parseScore(result.social_scores?.empathy), fullMark: 100 },
        { subject: 'Открытость', value: parseScore(result.social_scores?.openness), fullMark: 100 },
        { subject: 'Доверие', value: parseScore(result.social_scores?.trust), fullMark: 100 },
        { subject: 'Токсичность', value: parseScore(result.social_scores?.toxicity), fullMark: 100 },
        { subject: 'Манипуляция', value: parseScore(result.social_scores?.manipulation), fullMark: 100 },
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
                            opacity: 0.4
                        }}
                    />
                    <div
                        className="avatar-ring"
                        style={{
                            background: result.aura?.color
                                ? `linear-gradient(135deg, ${result.aura.color} 0%, #ffffff 100%)`
                                : 'linear-gradient(135deg, var(--primary) 0%, #00D4FF 100%)',
                            boxShadow: result.aura?.color
                                ? `0 8px 32px ${result.aura.color}66`
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
                <p className="result-subtitle">Психологический профиль</p>
                <div className="flex flex-col items-center gap-3 mt-4">
                    <div className="result-psychotype">
                        {result.profile_summary?.psychotype || 'Анализ завершён'}
                    </div>
                    {result.aura && (
                        <div
                            className="aura-badge"
                            style={{
                                '--aura-color': result.aura.color,
                                background: `${result.aura.color}15`,
                                border: `1px solid ${result.aura.color}40`,
                                color: result.aura.color
                            }}
                        >
                            <span className="material-symbols-outlined">auto_awesome</span>
                            {result.aura.description}
                        </div>
                    )}
                </div>
            </motion.header>

            {/* ===== ВЕРДИКТ СИСТЕМЫ ===== */}
            <motion.section variants={item} className="card-dark">
                <div className="card-header-dark">
                    <span className="material-symbols-outlined icon-primary">terminal</span>
                    <h3>Вердикт Системы</h3>
                </div>
                <div className="verdict-quote">
                    <p>"{renderValue(result.system_verdict?.truth_bomb, 'Анализ не выявил ключевых инсайтов')}"</p>
                </div>
                <div className="verdict-details">
                    <div className="verdict-item">
                        <h4 className="verdict-label-primary">
                            <span className="material-symbols-outlined">bolt</span>
                            Главный конфликт
                        </h4>
                        <p>{renderValue(result.system_verdict?.main_conflict)}</p>
                    </div>
                    <div className="verdict-item">
                        <h4 className="verdict-label-danger">
                            <span className="material-symbols-outlined">warning</span>
                            Самосаботаж
                        </h4>
                        <p>{renderValue(result.system_verdict?.self_sabotage)}</p>
                    </div>
                </div>
            </motion.section>

            {/* ===== ОБЩИЙ ПРОФИЛЬ ===== */}
            <motion.div variants={item} className="card-glass">
                <div className="card-header">
                    <span className="material-symbols-outlined icon-primary">summarize</span>
                    <h3>Общий Профиль</h3>
                </div>
                <p className="card-text">
                    {renderValue(result.profile_summary?.summary, 'Описание профиля недоступно')}
                </p>
                {result.profile_summary?.core_pattern && (
                    <div className="card-highlight">
                        <span className="card-highlight-label">Ключевой паттерн</span>
                        <p>{result.profile_summary.core_pattern}</p>
                    </div>
                )}
            </motion.div>

            {/* ===== СЕКЦИЯ: МЫШЛЕНИЕ ===== */}
            <motion.div variants={item} className="section-divider">
                <h2>МЫШЛЕНИЕ</h2>
                <p>Как устроен ваш ум</p>
            </motion.div>

            {/* Матрица личности */}
            <PremiumGate isPaid={result.isPaid} title="Матрица личности">
                <motion.div variants={item} className="card-glass">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-primary">insights</span>
                        <h3>Матрица Личности</h3>
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
                <h3 className="card-title-primary">Логика решений</h3>
                <p className="card-text">
                    {renderValue(result.cognitive_profile?.decision_logic)}
                </p>
            </motion.div>

            {/* Слепые зоны и Искажения */}
            <PremiumGate isPaid={result.isPaid} title="Скрытые механизмы" compact={true}>
                <motion.div variants={item} className="cards-row">
                    <div className="card-danger">
                        <div className="card-header-mini">
                            <span className="material-symbols-outlined icon-danger">visibility_off</span>
                            <span className="card-label-inline">Слепые зоны</span>
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
                        <h3 className="card-mini-title">Искажения</h3>
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
                <h2>Сильная сторона</h2>
                <p>Ваши таланты и потенциал</p>
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
                    <h3>Ваши таланты</h3>
                </div>

                <div className="plan-section">
                    <span className="plan-label success">Естественная сила</span>
                    <p className="card-text">{renderValue(result.positive_core?.natural_strengths)}</p>
                </div>

                <div className="plan-quote">
                    <span className="plan-quote-label">Где это работает:</span>
                    {renderValue(result.positive_core?.real_world_value)}
                </div>

                <div className="plan-success-bubble">
                    {renderValue(result.positive_core?.unique_trait)}
                </div>
            </motion.div>

            {/* ===== СЕКЦИЯ: ЭМОЦИИ ===== */}
            <motion.div variants={item} className="section-divider">
                <h2>ЭМОЦИИ</h2>
                <p>Реакции и поведение</p>
            </motion.div>

            {/* Стресс и Регуляция */}
            <motion.div variants={item} className="cards-row">
                <div className="card-glass">
                    <div className="card-header-mini">
                        <span className="material-symbols-outlined icon-primary">bolt</span>
                        <span className="card-label-inline">Стресс</span>
                    </div>
                    <p className="card-text-compact">{renderValue(result.emotional_profile?.stress_response)}</p>
                </div>
                <div className="card-glass">
                    <div className="card-header-mini">
                        <span className="material-symbols-outlined icon-primary">self_improvement</span>
                        <span className="card-label-inline">Регуляция</span>
                    </div>
                    <p className="card-text-compact">{renderValue(result.emotional_profile?.regulation)}</p>
                </div>
            </motion.div>

            {/* Паттерны поведения */}
            <motion.div variants={item} className="card-glass">
                <h3 className="card-mini-title">Паттерны поведения</h3>
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
            <PremiumGate isPaid={result.isPaid} title="Эмоциональный спектр" compact={true}>
                <motion.div variants={item} className="card-glass">
                    <h3 className="card-mini-title">Базовые эмоции</h3>
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
                <h2>ТЁМНАЯ СТОРОНА</h2>
                <p>Скрытые черты и маски</p>
            </motion.div>

            {/* Теневой профиль — ШИРОКИЙ В КРАСНОМ СТИЛЕ */}
            <PremiumGate isPaid={result.isPaid} title="Теневой Профиль">
                <motion.div variants={item} className="card-glass card-shadow-red">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-danger">mist</span>
                        <h3>Теневой Профиль</h3>
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
            <PremiumGate isPaid={result.isPaid} title="Социальная динамика" compact={true}>
                <motion.div variants={item} className="card-glass">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-primary">groups</span>
                        <h3>Социальная динамика</h3>
                    </div>
                    <div className="metrics-list">
                        {[
                            { label: 'Стиль общения', value: result.social_profile?.communication_style },
                            { label: 'Тип привязанности', value: result.social_profile?.attachment },
                            { label: 'Доверие', value: result.social_profile?.trust_issues },
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
                <h2>РОСТ</h2>
                <p>Потенциал и точки роста</p>
            </motion.div>

            {/* Силы и Риски */}
            <motion.div variants={item} className="cards-row">
                <div className="card-success">
                    <h4>Силы</h4>
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
                    <h4>Риски</h4>
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
            <PremiumGate isPaid={result.isPaid} title="План Развития" compact={true}>
                <motion.div variants={item} className="card-glass">
                    <div className="card-header">
                        <span className="material-symbols-outlined icon-success">trending_up</span>
                        <h3>План Развития</h3>
                    </div>

                    {result.development_plan?.growth_points?.length > 0 && (
                        <div className="plan-section">
                            <span className="plan-label success">Точки прорыва</span>
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
                            <span className="plan-quote-label">Что изменить:</span>
                            {result.development_plan.what_to_change}
                        </div>
                    )}

                    {result.development_plan?.what_happens_if_not && (
                        <div className="plan-warning">
                            <span className="plan-warning-label">Прогноз:</span>
                            {result.development_plan.what_happens_if_not}
                        </div>
                    )}
                </motion.div>
            </PremiumGate>

            {/* Уязвимости */}
            <PremiumGate isPaid={result.isPaid} title="Уязвимости" compact={true}>
                <motion.div variants={item} className="card-glass card-border-danger">
                    <h3 className="card-mini-title">Уязвимости</h3>
                    <div className="vulnerabilities">
                        {result.weak_zones?.vulnerabilities?.length > 0 && (
                            <div>
                                <span className="vuln-label">Зоны</span>
                                <p>{result.weak_zones.vulnerabilities.map(formatCamelCase).join(', ')}</p>
                            </div>
                        )}
                        {result.weak_zones?.triggers?.length > 0 && (
                            <div>
                                <span className="vuln-label">Триггеры</span>
                                <p>{result.weak_zones.triggers.map(formatCamelCase).join(', ')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </PremiumGate>

            {/* Уверенность анализа — В СТИЛЕ ЛОГИКИ РЕШЕНИЙ */}
            {result.confidence && (
                <motion.div variants={item} className="card-glass">
                    <h3 className="card-title-primary">Уверенность анализа</h3>
                    <p className="card-text">
                        {result.confidence}
                    </p>
                </motion.div>
            )}

            {/* ===== КНОПКА ===== */}
            <motion.div variants={item} className="result-footer">
                <button onClick={onReset} className="btn-gradient">
                    <span className="material-symbols-outlined">analytics</span>
                    НОВЫЙ АНАЛИЗ
                </button>
            </motion.div>
        </motion.div>
    );
}