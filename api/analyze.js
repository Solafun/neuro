import OpenAI from 'openai';
import axios from 'axios';
import { trackCheck, checkUserStatus, getAppStatus, decrementCheck } from './lib/supabase.js';

// Aggressively suppress DEP0169 (url.parse) deprecation warning
const originalEmit = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('DEP0169')) return;
  if (warning && typeof warning === 'object' && warning.code === 'DEP0169') return;
  return originalEmit.call(process, warning, ...args);
};
process.removeAllListeners('warning');

// Discovery for VseGPT keys (supports up to 500 keys)
const vsegptKeys = [];
if (process.env.VSEGPT_KEY) vsegptKeys.push(process.env.VSEGPT_KEY);
for (let i = 1; i <= 500; i++) {
  const keyName = `VSEGPT_KEY_${i}`;
  const val = process.env[keyName];
  if (val) vsegptKeys.push(val);
}

console.log(`Initialized with ${vsegptKeys.length} VseGPT API keys.`);

// Массив клиентов OpenAI для ротации (настроен на VseGPT)
const aiClients = vsegptKeys.map(key => new OpenAI({
  apiKey: key,
  baseURL: 'https://api.vsegpt.ru/v1',
  defaultHeaders: {
    "X-Title": "Threads Profile Analysis"
  }
}));

const modelName = "openai/gpt-4.1-nano";

async function scrapeThreadsProfile(nickname) {
  const url = `https://www.threads.net/@${nickname}`;
  const docId = '26348014344885149';
  const debug = {
    url,
    html_length: 0,
    status: 0,
    og_image: null,
    og_title: null,
    profileExists: false,
    posts_raw_count: 0
  };
  try {
    console.log(`Scraping started for: ${nickname}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-IG-App-ID': '238260118697367',
        'X-ASBD-ID': '129477',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
    const html = response.data;
    debug.html_length = html?.length || 0;
    debug.status = response.status;
    if (!html || html.length < 500) return { nickname, bio: '', posts: [], avatar: null, profileExists: false, debug };
    const setCookie = response.headers['set-cookie'];
    const capturedCookies = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
    let profileData = { nickname, bio: '', posts: [], avatar: null, profileExists: false };
    let ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/) || html.match(/content="([^"]+)"\s+property="og:image"/);
    if (ogMatch) profileData.avatar = ogMatch[1].replace(/&amp;/g, '&');
    const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/) || html.match(/content="([^"]+)"\s+property="og:title"/);
    if (titleMatch) profileData.profileExists = true;
    const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/) || html.match(/content="([^"]+)"\s+property="og:description"/);
    if (descMatch) profileData.bio = descMatch[1].replace(/&amp;/g, '&');
    const keysToSearch = ['text', 'caption_text', 'body', 'content', 'caption'];
    let allTexts = [];
    keysToSearch.forEach(key => {
      const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
      const matches = html.match(regex) || [];
      matches.forEach(m => {
        try {
          const colonIndex = m.indexOf(':');
          const quoteStart = m.indexOf('"', colonIndex);
          if (quoteStart === -1) return;
          const val = m.slice(quoteStart + 1, -1);
          allTexts.push(JSON.parse('"' + val + '"'));
        } catch (e) { }
      });
    });
    allTexts.forEach(text => {
      if (text.length > 5 && text.split(/\s+/).length >= 2 && !profileData.posts.includes(text) && !text.startsWith('{') && !text.includes('<!DOCTYPE') && !text.includes('__typename')) {
        profileData.posts.push(text);
      }
    });

    let lsdToken = (html.match(/\["LSD",\[\],\{"token":"([^"]+)"\}/) || [])[1];
    let userID = (html.match(/"user_id":"(\d+)"/) || html.match(/"userID":"(\d+)"/) || [])[1];
    let paginationCursor = (html.match(/"end_cursor":"([^"]+)"/) || html.match(/"after":"([^"]+)"/) || [])[1];
    if (lsdToken && userID && paginationCursor) {
      let pagesFetched = 0;
      const docIds = ['6232751443445612', '6307565049326713', '25253062245498498'];
      while (pagesFetched < 5 && profileData.posts.length < 70) {
        pagesFetched++;
        const gqlUrl = 'https://www.threads.net/api/graphql';
        const variables = { userID: userID, cursor: paginationCursor };
        const payload = `lsd=${lsdToken}&variables=${encodeURIComponent(JSON.stringify(variables))}&doc_id=${docIds[0]}`;
        try {
          const resGql = await axios.post(gqlUrl, payload, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-IG-App-ID': '238260118697367',
              'X-FB-LSD': lsdToken,
              'Cookie': capturedCookies || ''
            },
            timeout: 12000
          });
          const rawData = JSON.stringify(resGql.data);
          const regex = /"text"\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"/g;
          let match;
          while ((match = regex.exec(rawData)) !== null) {
            let txt = match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, g) => String.fromCharCode(parseInt(g, 16)));
            if (txt.length > 5 && !profileData.posts.includes(txt) && !txt.startsWith('{')) profileData.posts.push(txt);
          }
          const newCursor = (rawData.match(/"end_cursor"\s*:\\s*"([^"]+)"/) || [])[1];
          if (!newCursor) break;
          paginationCursor = newCursor;
        } catch (e) { break; }
      }
    }
    profileData.debug = debug;
    return profileData;
  } catch (error) {
    return { nickname, bio: '', posts: [], avatar: null, profileExists: false, debug };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const startTimeFull = Date.now();
  try {
    const nickname = req.body.nickname;
    if (!nickname) return res.status(400).json();

    const telegramId = req.body.telegramId;
    let isPaid = false, isAdmin = false, freeChecks = 1, paidChecks = 0;
    if (telegramId) {
      const status = await checkUserStatus(telegramId);
      isPaid = status.isPaid;
      isAdmin = status.isAdmin;
      freeChecks = status.freeChecks ?? 0;
      paidChecks = status.paidChecks ?? 0;
      if (process.env.ADMIN_TELEGRAM_ID && String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID)) isAdmin = true;
    }

    // CHECK LIMITS GATE
    if (!isAdmin) {
      const hasChecks = isPaid ? paidChecks > 0 : freeChecks > 0;
      if (!hasChecks) {
        return res.status(200).json({
          error: 'no_checks',
          message: isPaid
            ? 'Ваш лимит проверок исчерпан (30/30). Обратитесь в поддержку.'
            : 'Бесплатная проверка использована. Оформите подписку для продолжения.',
          isPaid,
          freeChecks: 0,
          paidChecks: isPaid ? 0 : undefined
        });
      }
    }

    const appStatus = await getAppStatus();
    if (appStatus?.is_maintenance === true && !isAdmin) {
      return res.status(200).json({ error: 'maintenance', message: appStatus.maintenance_message || 'Мы обновляем систему. Приложение временно недоступно.' });
    }

    const data = await scrapeThreadsProfile(nickname);
    if (data.posts.length === 0) {
      return res.status(200).json({ error: 'no_posts', message: 'В этом профиле нет публикаций для анализа.' });
    }

    const usedPosts = data.posts.slice(0, 60);
    const postsText = usedPosts.join('\n---\n');

    const isEn = req.body.lang === 'en';
    const outputLang = isEn ? 'ENGLISH' : 'RUSSIAN';
    const analysisMode = req.body.analysisMode || 'classic';

    let baseRules, profileDataBlock, strengthChartRules, megaPrompt;

    if (analysisMode === 'new') {
      if (isEn) {
        baseRules = `You are a deep psychological profiling system focused on relationships.
Your task is to analyze a person's texts (posts, messages, behavior descriptions) and produce a clear, insightful, and psychologically accurate breakdown of how they behave in close relationships.
The result must feel like: "this is exactly me".

==================================================
🔴 PRINCIPLES:
==================================================
- Explain not only WHAT happens, but WHY
- Analyze behavior, not just words
- Identify repeating patterns (cycles)
- Highlight contradictions (ideal self vs real behavior)
- Do not diagnose
- Do not invent without evidence
- If data is limited — explicitly say so
- Avoid generic psychology clichés
- Use simple, clear language but keep depth
- Use real-life patterns so the user recognizes themselves

==================================================
🔥 ENHANCEMENT (MANDATORY):
==================================================
- Add 1 strong "quote-like" insight in each block
- Show repetition ("this has happened before and will repeat")
- Create "you’ve been read" effect
- Explain hidden psychological logic
==================================================
🔥 ENHANCEMENT (MANDATORY):
==================================================
- Add 1 strong "quote-like" insight in each block
- Show repetition ("this has happened before and will repeat")
- Create "you’ve been read" effect
- Explain hidden psychological logic
- truth_bomb must expose self-deception

==================================================
⚡️ FORMATTING (STRICLY ENFORCED):
==================================================
- Keep sentences SHORT and PUNCHY. NO massive walls of text.
- Use explicit bullet points (•) and line breaks (\n) for lists.
- For relationship patterns, use explicit numbering (1., 2., 3.).

- CRITICAL: ALL values, terms, and text MUST BE STRICTLY IN ENGLISH.
- GENDER: Analyze nickname and posts to determine gender. ALWAYS use correct gender forms.`;
      } else {
        baseRules = `Ты являешься системой глубокого психологического анализа личности в контексте отношений.
Твоя задача — на основе текстов человека (постов, сообщений, описаний поведения) создать точный, понятный и психологически глубокий разбор того, как человек ведет себя в близких отношениях.
Важно: результат должен вызывать эффект “это реально про меня”.

==================================================
🔴 ПРИНЦИПЫ:
==================================================
- Объясняй не только ЧТО происходит, но и ПОЧЕМУ
- Анализируй через поведение, а не через слова
- Выявляй повторяющиеся сценарии (циклы)
- Обязательно показывай противоречия (образ vs реальность)
- Не ставь диагнозы
- КРИТИЧЕСКИ ВАЖНО: Весь текст должен быть СТРОГО НА РУССКОМ ЯЗЫКЕ. Не используй английские термины вроде 'exhaustion', 'burnout', 'ghosting' и т.д. Используй только русские аналоги.
- ПОЛ: Анализируй никнейм и посты, чтобы определить пол. ВСЕГДА используй правильные гендерные формы (он/она).
- Не фантазируй без данных
- Если данных мало — прямо укажи это
- Избегай банальностей (например: “страх отвержения” без доказательств)
- Пиши простым, понятным языком, но сохраняй глубину
- Используй конкретные жизненные паттерны, чтобы человек узнавал себя

==================================================
🔥 УСИЛЕНИЕ (ОБЯЗАТЕЛЬНО):
==================================================
- В каждом блоке добавляй 1 короткий инсайт (сильная формулировка, как цитата)
- Показывай повторяемость поведения (“это уже было и повторится”)
- Создавай эффект “тебя прочитали”
- Объясняй скрытую логику действий
- truth_bomb должен вскрывать самообман, а не просто описывать проблему

==================================================
⚡️ ФОРМАТИРОВАНИЕ (ЖЕСТКОЕ ТРЕБОВАНИЕ):
==================================================
- Пиши КОРОТКИМИ и хлёсткими предложениями. НИКАКИХ огромных полотен текста.
- Используй маркеры (•) и переносы строк (\n) для перечисления фактов.
- Сценарий отношений расписывай строго по шагам (1., 2., 3.).
- Дробление текста на абзацы обязательно.

==================================================
💡 КАК АНАЛИЗИРОВАТЬ:
==================================================
1. Определи: как человек говорит о людях, как описывает близость и конфликты
2. Найди: повторяющиеся реакции (отдаление, контроль, зависимость)
3. Определи: разрыв между образом себя и реальным поведением
4. Построй: сценарий отношений (это ключ анализа)
5. Оцени: осознает ли человек свою роль в проблемах

- КРИТИЧНО: ВСЕ значения, термины и текст должны быть СТРОГО НА РУССКОМ ЯЗЫКЕ.
- КРИТИЧНО: ВСЕГДА используй правильный род из текстов пользователя.`;
      }

      profileDataBlock = `${isEn ? 'PROFILE DATA:' : 'ДАННЫЕ ПРОФИЛЯ:'}
Nickname: @${nickname}
Bio: ${data.bio || (isEn ? 'No bio' : 'Нет био')}
Posts:
${postsText || (isEn ? 'No posts found.' : 'Посты не найдены.')}`;

      const jsonFormatEn = `{
  "ideal_self": "Who the person WANTS to be (Detailed. 2-3 sentences. Use \n• for list if needed)",
  "real_behavior": "How they ACTUALLY behave (Mandatory bullet points using \n• . Max 4 bullets.)",
  "partner_attraction": "Who they are drawn to and WHY (Max 3 short sentences. MUST include the word 'Insight:' at the end)",
  "relationship_pattern": "Step-by-step cycle. MUST use these exact words: 'Beginning:', 'Development:', 'Outcome:'. (e.g., \nBeginning: ...\nDevelopment: ...\nOutcome: ...)",
  "awareness": {
    "level_text": "low / medium / high",
    "level_percent": 60,
    "description": "How aware they are of their patterns (1-2 short sentences)"
  },
  "mask_vs_reality": {
    "mask": "How they want to appear (Max 5 words)",
    "reality": "Actual behavior (Max 5 words)",
    "gap": "Main contradiction (Max 6 words)",
    "cost": "What it leads to (Max 6 words)"
  },
  "truth_bomb": "Sharp, deep insight exposing self-deception (3-5 sentences. Make it extremely long, raw, and highly detailed.)",
  "share_hook": "1 short viral sentence people want to share",
  "relationship_archetype": {
    "type": "Short catchy name of the role (2-4 words)",
    "description": "Who this person is in relationships (2-3 sentences)",
    "core_mechanism": "How this type works (cause → behavior → result)"
  },
  "analysis_mode": "new"
}`;

      const jsonFormatRu = `{
  "ideal_self": "Кем человек ХОЧЕТ быть в отношениях (Детально. 2-3 развернутых предложения)",
  "real_behavior": "Как человек реально ведет себя. Пиши СТРОГО списком. Каждый пункт с новой строки. Обязательно используй буллиты \n• для перечисления. Макс 4 пункта)",
  "partner_attraction": "К каким людям тянет и ПОЧЕМУ (Макс 3 ёмких предложения. ОБЯЗАТЕЛЬНО напиши слово 'Инсайт:' перед выводом в конце)",
  "relationship_pattern": "Повторяющийся сценарий. ОБЯЗАТЕЛЬНО используй эти слова: 'Начало:', 'Развитие:', 'Итог:'. (Напр: \nНачало: ... \nРазвитие: ... \nИтог: ...)",
  "awareness": {
    "level_text": "низкий / средний / высокий",
    "level_percent": 60,
    "description": "Насколько осознает свои паттерны (1-2 предложения)"
  },
  "mask_vs_reality": {
    "mask": "Как хочет выглядеть (Макс 5 слов)",
    "reality": "Как ведет себя на самом деле (Макс 5 слов)",
    "gap": "Главное противоречие (Макс 6 слов)",
    "cost": "Чем это заканчивается (Макс 6 слов)"
  },
  "truth_bomb": "Жесткий, глубокий инсайт, вскрывающий самообман (3-5 развернутых предложений. Пиши максимально длинно, жестко и детально)",
  "share_hook": "Короткая фраза (1 предложение), которую хочется отправить",
  "relationship_archetype": {
    "type": "Яркое название типа (2-4 слова)",
    "description": "Кто этот человек в отношениях (2-3 предложения)",
    "core_mechanism": "Как работает этот тип (причина → поведение → результат)"
  },
  "analysis_mode": "new"
}`;

      megaPrompt = `${baseRules}
==================================================
💥 КРИТИЧЕСКИЕ ТРЕБОВАНИЯ ДЛЯ ТИПАЖА:
- Определи архетип поведения (роль).
- Название должно быть ярким, коротким и запоминающимся (2-4 слова).
- Это НЕ диагноз, а поведенческий паттерн.
- Архетип должен звучать как “ярлык, который хочется запомнить и показать другим”.
- В поле description НЕ используй кавычки.
==================================================
📊 ${isEn ? 'RETURN JSON' : 'ВЕРНИ JSON'}:
==================================================
${isEn ? jsonFormatEn : jsonFormatRu}
==================================================
${profileDataBlock}`;

    } else {
      // CLASSIC MODE
      if (isEn) {
        baseRules = `You are a deep psychological profiling system.
Your task is to create an accurate, understandable, and psychologically deep personality analysis based on user texts.
==================================================
🔴 PRINCIPLES:
==================================================
- Explain not just WHAT is there, but WHY.
- Identify internal contradictions (this is key).
- Do not diagnose.
- Do not fantasize without data.
- If unsure — state it.
- CRITICAL: Avoid template psychological conclusions (e.g., fear of rejection, loss of freedom). Your task is to find a UNIQUE trait of this specific person based on their vocabulary and topics.
- Write in simple, understandable language (avoid jargon overload), but maintain psychological depth.
- CRITICAL: ALL values, terms, and text MUST BE STRICTLY IN ENGLISH.
- FORBIDDEN: Use any Cyrillic characters.
- GENDER: Analyze nickname and posts to determine gender. ALWAYS use correct gender forms. If undetermined, use gender-neutral language.`;

        profileDataBlock = `PROFILE DATA:
Nickname: @${nickname}
Bio: ${data.bio || 'No bio'}
Posts:
${postsText || 'No posts found.'}`;

        strengthChartRules = `==================================================
📊 BLOCK: STRENGTHS CHART
==================================================
Task: Highlight TOP-3 key strengths from the list below and rate them from 0 to 100.
Allowed names (use ONLY these):
- Analytics
- Empathy
- Self-control
- Flexibility
- Strategic
- Observation
- Communication
- Decisiveness
- Creativity
- Resilience

Rating rules (value field):
- 0-30 = weak
- 30-70 = medium
- 70-100 = strong
Important:
- Pick exactly 3 most prominent sides.
- All values and text MUST BE STRICTLY IN ENGLISH.`;

        if (isPaid) {
          megaPrompt = `${baseRules}
==================================================
📊 RETURN JSON:
==================================================
{
"profile_summary": {
    "psychotype": "<Vivid role label, e.g.: Quiet Strategist, Emotional Architect, Chaotic Visionary>",
    "summary": "<Essence of personality, 3-4 sentences>",
    "core_pattern": "<Main behavioral loop, e.g.: Anxious hypercompensation through control>"
    },
  "positive_core": {
    "natural_strengths": "Innate qualities.",
    "real_world_value": "Situations where this gives an advantage.",
    "unique_trait": "What really sets them apart from 99% of others.",
    "strength_chart": [{ "name": "Name", "value": "0-100" }]
      },
  "system_verdict": {
    "truth_bomb": "Main uncomfortable truth.",
    "main_conflict": "Specific clash of two needs.",
    "self_sabotage": "How they hinder themselves."
    },
  "cognitive_profile": {
    "thinking_style": "How the brain processes information.",
    "decision_logic": "What they rely on when making decisions.",
    "biases": ["3-4 cognitive biases with justification."],
    "blind_spots": ["2-3 blind spots. What the person DOES NOT SEE in their behavior."]
    },
  "emotional_profile": {
    "core_emotions": ["3-4 dominant feelings"],
    "regulation": "How they suppress or express feelings.",
    "stress_response": "Type of reaction to threat."
    },
  "behavior_profile": {
    "patterns": ["BEHAVIORAL CYCLE: situation → reaction → result"],
    "life_strategy": "Control / Avoidance / Struggle / Adaptation."
    },
  "social_profile": {
    "communication_style": "Communication style (2-3 words).",
    "attachment": "Attachment type.",
    "trust_issues": "Degree of openness.",
    "social_mask": "Who they want to seem to be."
    },
  "dark_profile": {
    "manipulation": "Methods of influence.",
    "toxicity": "How they poison the environment.",
    "control": "Desire for dominance.",
    "aggression": "How anger manifests.",
    "empathy": "Level of compassion.",
    "dark_traits": "Main shadow trait."
    },
  "strengths": ["Exactly 3 specific skills and behavior tricks."],
  "weak_zones": {
    "vulnerabilities": ["System pain points."],
    "triggers": ["What throws them off balance."],
    "risks": ["Exactly 3 risks. What collapse vulnerabilities will lead to."]
    },
  "development_plan": {
    "growth_points": ["growth points"],
    "what_to_change": "what to change in behavior",
    "what_happens_if_not": "what happens if nothing changes"
      },
"personality_scores": { "logic": 0-100, "emotionality": 0-100, "control": 0-100, "adaptability": 0-100, "awareness": 0-100 },
"social_scores": { "empathy": 0-100, "openness": 0-100, "toxicity": 0-100, "manipulation": 0-100, "trust": 0-100 },
"confidence": "high / medium / low + why",
"aura": {
    "color": "<HEX color code, e.g.: #FF5733>",
    "description": "<Short poetic aura name, e.g.: Radiant Emerald>"
}
}
${strengthChartRules}
${profileDataBlock}`;
        } else {
          megaPrompt = `${baseRules}
==================================================
📊 RETURN JSON (ONLY THESE BLOCKS):
==================================================
{
"profile_summary": {
    "psychotype": "<Vivid role label>",
    "summary": "<Essence of personality, 3-4 sentences>",
    "core_pattern": "<Main behavioral loop>"
    },
  "positive_core": {
    "natural_strengths": "Innate qualities.",
    "real_world_value": "Situations where this gives an advantage.",
    "unique_trait": "What really sets them apart from others.",
    "strength_chart": [{ "name": "Name", "value": "0-100" }]
      },
  "system_verdict": {
    "truth_bomb": "Main uncomfortable truth.",
    "main_conflict": "Specific clash of two needs.",
    "self_sabotage": "How they hinder themselves."
    },
  "cognitive_profile": {
    "thinking_style": "How the brain processes information.",
    "decision_logic": "What they rely on when making decisions."
    },
  "emotional_profile": {
    "regulation": "How they suppress or express feelings.",
    "stress_response": "Type of reaction to threat."
    },
  "behavior_profile": {
    "patterns": ["BEHAVIORAL CYCLE: situation → reaction → result"],
    "life_strategy": "Control / Avoidance / Struggle / Adaptation."
    },
  "strengths": ["Exactly 3 specific skills."],
  "weak_zones": {
    "risks": ["Exactly 3 risks."]
    },
  "confidence": "high / medium / low + why",
  "aura": {
    "color": "<HEX color code>",
    "description": "<Short poetic aura name>"
  }
}
${strengthChartRules}
${profileDataBlock}`;
        }
      } else {
        // RUSSIAN PROMPT
        baseRules = `Ты являешься системой глубокого психологического профайлинга личности.
Твоя задача — на основе текстов человека создать точный, понятный и психологически глубокий разбор личности.
==================================================
🔴 ПРИНЦИПЫ:
==================================================
- Объясняй не только ЧТО есть, но и ПОЧЕМУ
- Выявляй внутренние противоречия (это ключ)
- Не ставь диагнозы
- Не фантазируй без данных
- Если не уверен — укажи это
- КРИТИЧНО: Избегай шаблонных психологических выводов (про страх отвержения, потерю свободы и т.д.). Твоя задача — найти УНИКАЛЬНУЮ черту этого конкретного человека на основе его лексики и тем.
- Пиши простым, понятным языком (без перегруза терминами), но сохраняй глубину.
- КРИТИЧНО: ВСЕ значения, термины и текст должны быть СТРОГО НА РУССКОМ ЯЗЫКЕ.
- КРИТИЧНО: Проанализируй имя профиля и окончания глаголов в постах, чтобы определить пол пользователя. ВСЕГДА используй правильный род. Если пол определить абсолютно невозможно, формулируй предложения так, чтобы избегать упоминания пола.`;

        profileDataBlock = `ДАННЫЕ ПРОФИЛЯ:
Nickname: @${nickname}
Bio: ${data.bio || 'Нет био'}
Posts:
${postsText || 'Посты не найдены.'}`;

        strengthChartRules = `==================================================
📊 БЛОК: ГРАФИК СИЛЬНЫХ СТОРОН
==================================================
Задача: Выделить ТОП-3 ключевых сильных стороны из списка ниже и оценить их выраженность от 0 до 100.
Допустимые названия (используй ТОЛЬКО их):
- Аналитика
- Эмпатия
- Самоконтроль
- Гибкость
- Стратегичность
- Наблюдательность
- Коммуникация
- Решительность
- Креативность
- Устойчивость

Правила оценки (поле value):
- 0-30 = слабо выражено
- 30-70 = средне
- 70-100 = сильно выражено
Важно:
- Выбери именно 3 наиболее выраженные стороны.
- Все значения и текст должны быть СТРОГО НА РУССКОМ ЯЗЫКЕ.`;

        if (isPaid) {
          megaPrompt = `${baseRules}
==================================================
📊 ВЕРНИ JSON:
==================================================
{
"profile_summary": {
    "psychotype": "<Придумай яркий ярлык-роль для этого человека, например: Тихий Стратег, Эмоциональный Архитектор, Хаотичный Визионер>",
    "summary": "<Кто этот человек, его суть личности, 3-4 предложения>",
    "core_pattern": "<Главная поведенческая петля, например: Тревожная гиперкомпенсация через контроль>"
    },
  "positive_core": {
    "natural_strengths": "Врожденные качества.",
    "real_world_value": "В каких ситуациях эта природа дает преимущество.",
    "unique_trait": "То, что реально отличает от 99% других.",
    "strength_chart": [{ "name": "Название", "value": "0-100" }]
      },
  "system_verdict": {
    "truth_bomb": "Главная неудобная правда.",
    "main_conflict": "Конкретное столкновение двух потребностей.",
    "self_sabotage": "Каким действием мешает себе."
    },
  "cognitive_profile": {
    "thinking_style": "Как мозг обрабатывает информацию.",
    "decision_logic": "На что опирается при принятии решений.",
    "biases": ["3-4 когнитивных искажения с обоснованием."],
    "blind_spots": ["2-3 слепые зоны. То, что человек НЕ ВИДИТ в своем поведении."]
    },
  "emotional_profile": {
    "core_emotions": ["3-4 доминирующих чувства"],
    "regulation": "Как подавляет или выражает свои чувства.",
    "stress_response": "Тип реакции на угрозу."
    },
  "behavior_profile": {
    "patterns": ["ПОВЕДЕНЧЕСКИЙ ЦИКЛ: ситуация → реакция → результат"],
    "life_strategy": "Контроль / Избегание / Борьба / Адаптация."
    },
  "social_profile": {
    "communication_style": "Стиль общения (2-3 слова).",
    "attachment": "Тип привязанности.",
    "trust_issues": "Степень открытости.",
    "social_mask": "Кем хочет казаться."
    },
  "dark_profile": {
    "manipulation": "Методы влияния.",
    "toxicity": "Как отравляет среду.",
    "control": "Стремление к доминированию.",
    "aggression": "Как проявляется злость.",
    "empathy": "Уровень сопереживания.",
    "dark_traits": "Главная теневая черта."
    },
  "strengths": ["Ровно 3 конкретных навыка и фишки поведения."],
  "weak_zones": {
    "vulnerabilities": ["Болевые точки системы."],
    "triggers": ["Что выводит из равновесия."],
    "risks": ["Ровно 3 риска. К какому краху приведут уязвимости."]
    },
  "development_plan": {
    "growth_points": ["точки роста"],
    "what_to_change": "что изменить в поведении",
    "what_happens_if_not": "что будет если ничего не менять"
      },
"personality_scores": { "logic": 0-100, "emotionality": 0-100, "control": 0-100, "adaptability": 0-100, "awareness": 0-100 },
"social_scores": { "empathy": 0-100, "openness": 0-100, "toxicity": 0-100, "manipulation": 0-100, "trust": 0-100 },
"confidence": "высокая / средняя / низкая + почему",
"aura": {
    "color": "<HEX-код цвета, отражающего ауру, например: #FF5733>",
    "description": "<Короткое поэтическое название ауры на русском языке, например: Сияющий Изумруд>"
}
}
${strengthChartRules}
${profileDataBlock}`;
        } else {
          megaPrompt = `${baseRules}
==================================================
📊 ВЕРНИ JSON (ТОЛЬКО ЭТИ БЛОКИ):
==================================================
{
"profile_summary": {
    "psychotype": "<Придумай яркий ярлык-роль для этого человека>",
    "summary": "<Кто этот человек, его суть личности, 3-4 предложения>",
    "core_pattern": "<Главная поведенческая петля>"
    },
  "positive_core": {
    "natural_strengths": "Врожденные качества.",
    "real_world_value": "В каких ситуациях эта природа дает преимущество.",
    "unique_trait": "То, что реально отличает от других.",
    "strength_chart": [{ "name": "Название", "value": "0-100" }]
      },
  "system_verdict": {
    "truth_bomb": "Главная неудобная правда.",
    "main_conflict": "Конкретное столкновение двух потребностей.",
    "self_sabotage": "Каким действием мешает себе."
    },
  "cognitive_profile": {
    "thinking_style": "Как мозг обрабатывает информацию.",
    "decision_logic": "На что опирается при принятии решений."
    },
  "emotional_profile": {
    "regulation": "Как подавляет или выражает свои чувства.",
    "stress_response": "Тип реакции на угрозу."
    },
  "behavior_profile": {
    "patterns": ["ПОВЕДЕНЧЕСКИЙ ЦИКЛ: ситуация → реакция → результат"],
    "life_strategy": "Контроль / Избегание / Борьба / Адаптация."
    },
  "strengths": ["Ровно 3 конкретных навыка."],
  "weak_zones": {
    "risks": ["Ровно 3 риска."]
    },
  "confidence": "высокая / средняя / низкая + почему",
  "aura": {
    "color": "<HEX-код цвета, отражающего ауру>",
    "description": "<Короткое поэтическое название ауры на русском языке>"
  }
}
${strengthChartRules}
${profileDataBlock}`;
        }
      }
    } // END OF CLASSIC MODE

    // AI CALL (Baseten OpenAI SDK with stream accumulation)
    let analysisResult, lastError;
    const startTimeAI = Date.now();

    for (const client of aiClients) {
      try {
        console.log(`Attempting VseGPT (OpenAI SDK): ${modelName}`);
        const stream = await client.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: `Ты — профессиональный психолог-профайлер. Создай JSON-отчет. Пиши ТОЛЬКО на языке ${outputLang}.` },
            { role: "user", content: megaPrompt }
          ],
          stream: true,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        let fullContent = "";
        for await (const chunk of stream) {
          fullContent += (chunk.choices[0]?.delta?.content || "");
        }

        try {
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
          analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : fullContent);

          // Map top-level strengths to positive_core for frontend compatibility (preserving prompt)
          if (analysisResult.strengths && analysisResult.positive_core && !analysisResult.positive_core.strengths) {
            analysisResult.positive_core.strengths = analysisResult.strengths;
          }

          if (analysisResult) break;
        } catch (e) {
          console.error("JSON Parse Error:", e);
          lastError = e;
        }
      } catch (e) {
        console.warn(`Key failed: ${e.message}`);
        lastError = e;
        continue;
      }
    }

    if (!analysisResult) throw lastError || new Error("AI failed");
    console.log(`AI Phase: ${Date.now() - startTimeAI}ms`);

    // STATS + DECREMENT CHECK
    await trackCheck(telegramId, nickname).catch(() => { });
    let finalFreeChecks = freeChecks;
    let finalPaidChecks = paidChecks;

    if (telegramId) {
      const remaining = await decrementCheck(telegramId, isPaid).catch(() => null);
      if (remaining !== null) {
        if (isPaid) finalPaidChecks = remaining;
        else finalFreeChecks = remaining;
      } else {
        if (isPaid) finalPaidChecks = Math.max(0, paidChecks - 1);
        else finalFreeChecks = Math.max(0, freeChecks - 1);
      }
    }

    return res.status(200).json({
      nickname: data.nickname,
      avatar: data.avatar,
      posts_found: usedPosts.length,
      isPaid,
      freeChecks: finalFreeChecks,
      paidChecks: finalPaidChecks,
      ...analysisResult
    });

  } catch (err) {
    console.error('Handler error:', err);
    // Скрываем технические детали от пользователя
    const safeMessage = (err.message && (
      err.message.includes('balance') ||
      err.message.includes('money') ||
      err.message.includes('account') ||
      err.message.includes('API') ||
      err.message.includes('key') ||
      err.message.includes('vsegpt') ||
      err.message.includes('401') ||
      err.message.includes('403') ||
      err.message.includes('429') ||
      err.message.includes('500')
    ))
      ? 'Сервис временно недоступен. Попробуйте позже.'
      : (err.message || 'Произошла ошибка. Попробуйте позже.');
    return res.status(200).json({ error: 'fatal_error', message: safeMessage });
  }
}