import axios from 'axios';
import { trackCheck, checkUserStatus, getAppStatus } from './lib/supabase.js';

// Discovery for many Baseten keys
const basetenKeys = [];
// Main key
if (process.env.BASETEN_API_KEY) basetenKeys.push(process.env.BASETEN_API_KEY);
// Numbered keys: BASETEN_API_KEY_1, BASETEN_API_KEY_2 ...
for (let i = 1; i <= 500; i++) {
  const keyName = `BASETEN_API_KEY_${i}`;
  const val = process.env[keyName];
  if (val) basetenKeys.push(val);
}

// Error log if no keys found
if (basetenKeys.length === 0) {
  console.error("FATAL: No Baseten API keys found in environment variables!");
}

const modelName = "openai/gpt-oss-120b";

console.log(`Initialized with ${basetenKeys.length} Baseten API keys.`);

// Simple in-memory cache for maintenance status
let cachedAppStatus = null;
let lastAppStatusFetch = 0;
const STATUS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    console.log(`Scrape response status: ${response.status}, HTML length: ${debug.html_length}`);

    if (!html || html.length < 500) {
      console.warn("Invalid HTML length returned from Threads");
      return { nickname, bio: '', posts: [], avatar: null, profileExists: false, debug };
    }

    // Capture Cookies
    const setCookie = response.headers['set-cookie'];
    const capturedCookies = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
    if (capturedCookies) console.log(`Captured cookies for GraphQL session: ${capturedCookies.substring(0, 50)}...`);

    let profileData = {
      nickname,
      bio: '',
      posts: [],
      avatar: null,
      profileExists: false,
    };

    // --- Avatar extraction ---
    let ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (!ogMatch) ogMatch = html.match(/content="([^"]+)"\s+property="og:image"/);

    if (ogMatch) {
      const ogImage = ogMatch[1].replace(/&amp;/g, '&');
      debug.og_image = ogImage.substring(0, 100);
      profileData.avatar = ogImage;
    }

    // --- Profile existence ---
    const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/) ||
      html.match(/content="([^"]+)"\s+property="og:title"/);

    if (titleMatch) {
      const title = titleMatch[1].toLowerCase();
      debug.og_title = titleMatch[1];
      profileData.profileExists = true;
    }

    // --- Bio extraction ---
    const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/) ||
      html.match(/content="([^"]+)"\s+property="og:description"/);
    if (descMatch) {
      profileData.bio = descMatch[1].replace(/&amp;/g, '&');
    }

    // --- Posts extraction ---
    const keysToSearch = ['text', 'caption_text', 'body', 'content', 'caption'];
    let allTexts = [];

    keysToSearch.forEach(key => {
      // Relaxed regex to allow spaces around colons and handle escaped quotes
      const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
      const matches = html.match(regex) || [];
      if (matches.length > 0) {
        console.log(`Initial HTML: Found ${matches.length} blocks for key: "${key}"`);
        matches.forEach(m => {
          try {
            // Robustly find the start of the value after the first ":"
            const colonIndex = m.indexOf(':');
            const quoteStart = m.indexOf('"', colonIndex);
            if (quoteStart === -1) return;

            const val = m.slice(quoteStart + 1, -1);
            const text = JSON.parse('"' + val + '"');
            allTexts.push(text);
          } catch (e) { }
        });
      }
    });

    // Filter text to find actual posts
    let filteredCount = 0;
    for (const text of allTexts) {
      if (
        text.length > 5 &&
        text.split(/\s+/).length >= 2 &&
        !profileData.posts.includes(text) &&
        !text.startsWith('{') &&
        !text.includes('<!DOCTYPE') &&
        !text.includes('__typename')
      ) {
        profileData.posts.push(text);
      } else {
        filteredCount++;
      }
    }
    console.log(`Initial HTML: Filtered out ${filteredCount} blocks, kept ${profileData.posts.length} unique posts`);

    // --- Pagination / GraphQL Tokens Extraction ---
    let lsdToken = null;
    let userID = null;
    let afterCursor = null;

    // Extract LSD
    const lsdMatch = html.match(/\["LSD",\[\],\{"token":"([^"]+)"\}/);
    if (lsdMatch) lsdToken = lsdMatch[1];

    // Extract UserID
    const userIdMatch = html.match(/"user_id":"(\d+)"/) || html.match(/"userID":"(\d+)"/);
    if (userIdMatch) userID = userIdMatch[1];

    // Extract Cursor
    const cursorMatch = html.match(/"end_cursor":"([^"]+)"/) || html.match(/"after":"([^"]+)"/);
    if (cursorMatch) afterCursor = cursorMatch[1];

    console.log(`Tokens found: LSD=${!!lsdToken}, UserID=${userID}, Cursor=${!!afterCursor}`);

    // --- Fetch Next Pages (The Loop) ---
    let pagesFetched = 0;
    const MAX_PAGES = 5;
    const MAX_POSTS = 70;

    // PROVEN doc_ids from working scraper (tested and confirmed)
    const docIds = [
      '6232751443445612',   // BarcelonaProfileThreadsTabQuery
      '6307565049326713',   // alternative
      '25253062245498498',  // newer version
    ];
    let workingDocId = null; // Cache the first doc_id that works

    // We use 'cursor' for these doc_ids, not 'afterCursor' (different API)
    let paginationCursor = null;

    // If we have a cursor from initial HTML, use it; otherwise start without one
    // These doc_ids use 'cursor' key, not 'after'
    while (lsdToken && userID && pagesFetched < MAX_PAGES && profileData.posts.length < MAX_POSTS) {
      try {
        pagesFetched++;
        console.log(`Fetching page ${pagesFetched + 1} for @${nickname}... (Current unique posts: ${profileData.posts.length})`);

        const gqlUrl = 'https://www.threads.net/api/graphql';
        const variables = { userID: userID };
        if (paginationCursor) {
          variables.cursor = paginationCursor;
        }

        const gqlHeaders = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-IG-App-ID': '238260118697367',
          'X-FB-LSD': lsdToken,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://www.threads.net',
          'Referer': `https://www.threads.net/@${nickname}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Cookie': capturedCookies || ''
        };

        let gqlResponse = null;
        let rawDataStr = '';
        const idsToTry = workingDocId ? [workingDocId] : docIds;

        for (const tryDocId of idsToTry) {
          try {
            const payload = `lsd=${lsdToken}&variables=${encodeURIComponent(JSON.stringify(variables))}&doc_id=${tryDocId}`;
            gqlResponse = await axios.post(gqlUrl, payload, {
              headers: gqlHeaders,
              timeout: 12000
            });

            const gqlData = gqlResponse.data;
            rawDataStr = typeof gqlData === 'string' ? gqlData : JSON.stringify(gqlData);

            // Check if this is a valid response (not errors, not HTML)
            if (rawDataStr.startsWith('<!DOCTYPE')) {
              console.log(`doc_id ${tryDocId.slice(-6)}: Got HTML redirect, skipping`);
              continue;
            }
            if (rawDataStr.includes('missing_required_variable_value')) {
              console.log(`doc_id ${tryDocId.slice(-6)}: Missing variable, skipping`);
              continue;
            }

            // This doc_id worked!
            workingDocId = tryDocId;
            console.log(`Page ${pagesFetched + 1}: Using doc_id ...${tryDocId.slice(-6)}, Response size: ${rawDataStr.length}`);
            break;
          } catch (err) {
            console.log(`doc_id ${tryDocId.slice(-6)}: ${err.message}`);
            continue;
          }
        }

        if (!rawDataStr || rawDataStr.startsWith('<!DOCTYPE')) {
          console.log('All doc_ids failed, stopping pagination.');
          break;
        }

        if (rawDataStr.includes('errors')) {
          console.log(`Page ${pagesFetched + 1} ERRORS detected`);
          const errorMatch = rawDataStr.match(/"message"\s*:\s*"([^"]+)"/);
          if (errorMatch) console.log(`Error Msg: ${errorMatch[1]}`);
        }

        const beforeCount = profileData.posts.length;

        // Multi-strategy extraction: Try to find posts in any structure
        const searchKeys = ['text', 'caption_text', 'body', 'caption'];
        searchKeys.forEach(key => {
          const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
          let match;
          while ((match = regex.exec(rawDataStr)) !== null) {
            let text = match[1];
            try {
              text = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
              text = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
              if (text && text.trim().length > 5 && !profileData.posts.includes(text) && !text.startsWith('{')) {
                profileData.posts.push(text);
              }
            } catch (e) { }
          }
        });

        const newPosts = profileData.posts.length - beforeCount;
        console.log(`Page ${pagesFetched + 1}: Found ${newPosts} new unique posts (Total: ${profileData.posts.length})`);

        // Extract cursor for next page (multiple strategies)
        const endCursorMatch = rawDataStr.match(/"end_cursor"\s*:\s*"([^"]+)"/);
        const nextMaxMatch = rawDataStr.match(/"next_max_id"\s*:\s*"?([^",}\s]+)"?/);
        const afterMatch = rawDataStr.match(/"after"\s*:\s*"([^"]+)"/);

        if (endCursorMatch) {
          paginationCursor = endCursorMatch[1];
        } else if (nextMaxMatch) {
          paginationCursor = nextMaxMatch[1];
        } else if (afterMatch) {
          paginationCursor = afterMatch[1];
        } else {
          paginationCursor = null;
        }

        if (!paginationCursor) {
          console.log("No more cursors found, stopping pagination.");
          break;
        }
      } catch (gqlError) {
        console.warn(`Failed to fetch page ${pagesFetched + 1} via GraphQL:`, gqlError.message);
        break;
      }
    }

    console.log(`Extraction complete. Profile exists: ${profileData.profileExists}, Posts found total: ${profileData.posts.length}`);

    profileData.debug = debug;
    return profileData;
  } catch (error) {
    debug.error = error.message;
    console.error(`Error scraping @${nickname}:`, error.message);
    return { nickname, bio: '', posts: [], avatar: null, profileExists: false, debug };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const nickname = req.body.nickname;

    if (!nickname) {
      return res.status(400).json();
    }

    // 0. ПРОВЕРКА РЕЖИМА ТЕХРАБОТ (с кэшированием на 5 минут)
    const nowTs = Date.now();
    let appStatus = cachedAppStatus;

    if (!appStatus || (nowTs - lastAppStatusFetch) > STATUS_CACHE_TTL) {
      console.log("API Settings: fetching app status (cache expired)...");
      appStatus = await getAppStatus();
      cachedAppStatus = appStatus;
      lastAppStatusFetch = nowTs;
      console.log("API Settings result:", appStatus);
    }

    const telegramId = req.body.telegramId;
    let isPaid = false;
    let isAdmin = false;

    console.log(`Maintenance Check: user=${telegramId}, maintenance=${appStatus?.is_maintenance}, envAdmin=${process.env.ADMIN_TELEGRAM_ID}`);

    // Check if user is explicit admin via ENV
    if (telegramId && process.env.ADMIN_TELEGRAM_ID && String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID)) {
      isAdmin = true;
      console.log("Bypass: User recognized as ENV Admin");
    }

    // 1. Fetch user status first to check for Admin bypass
    if (telegramId && !isAdmin) {
      try {
        const status = await checkUserStatus(telegramId);
        isPaid = status.isPaid;
        isAdmin = status.isAdmin;
        console.log(`Bypass: DB Status - isPaid=${isPaid}, isAdmin=${isAdmin}`);
      } catch (e) {
        console.warn("Failed to check optional user status for bypass:", e.message);
      }
    }

    // 2. ENFORCE MAINTENANCE (Bypass for admins)
    if (appStatus?.is_maintenance === true && !isAdmin) {
      console.log("Maintenance: BLOCKED (User is not admin)");
      return res.status(200).json({
        error: 'maintenance',
        message: appStatus.maintenance_message || 'В данный момент ведутся технические работы. Пожалуйста, попробуйте позже.'
      });
    } else if (appStatus?.is_maintenance === true && isAdmin) {
      console.log("Maintenance: BYPASSED (User is admin)");
    }

    // 3. AI PHASE STARTED - Timing matches Scraping Phase start implicitly
    const startTimeFull = Date.now();
    const startTimeScrape = Date.now();
    const data = await scrapeThreadsProfile(nickname);
    console.log(`Scraping Phase: ${Date.now() - startTimeScrape}ms`);

    // Block empty profiles — return debug info so frontend can show it
    if (data.posts.length === 0) {
      return res.status(200).json({
        error: 'no_posts',
        message: 'В этом профиле нет публикаций для анализа. Возможно, ваш профиль не виден для нашего бота из-за ограничений Threads, либо он закрыт / пуст.'
      });
    }

    const usedPosts = data.posts.slice(0, 30); // Уменьшено с 60 до 30 для ускорения анализа
    const postsText = usedPosts.join('\n---\n');

    // ULTRA PROMPT INTEGRATION (Dynamic parts for Token Optimization)
    const promptHeader = `
Ты являешься системой глубокого психологического профайлинга личности.
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
- КРИТИЧНО: ВСЕ значения, термины и текст должны быть СТРОГО НА РУССКОМ ЯЗЫКЕ. Никаких английских слов (например, ancor, low, high, fight, anxious).
- ЗАПРЕЩЕНО: Использовать латиницу внутри русских слов (никакого транслита или смешивания символов). Все символы должны быть СТРОГО кириллическими.
- КРИТИЧНО: Проанализируй имя профиля и окончания глаголов в постах ("сделал" / "сделала"), чтобы определить пол пользователя. ВСЕГДА используй правильный род (он или она). Если пол определить абсолютно невозможно, формулируй предложения так, чтобы избегать упоминания пола, используй максимально ГЕНДЕРНО-НЕЙТРАЛЬНЫЙ и обтекаемый язык.
- КРИТИЧНО: ЗАПРЕЩЕНО использовать двойные кавычки (") внутри текстовых значений JSON. Если нужно процитировать что-то или выделить слово, используй только ОДИНАРНЫЕ кавычки (') или кавычки-ёлочки (« »). Верни СТРОГО чистый JSON без markdown разметки (без \`\`\`json).
`;

    // Common schema parts
    const schemaCore = `
  "profile_summary": {
    "psychotype": "СТАТИЧНЫЙ ЯРЛЫК (например: «Профессиональный Архитектор»). Отражает общую роль.",
    "summary": "Кто этот человек, его суть личности (3-4 предложения. Обязательно используй правильное местоимение 'он' или 'она' исли это возможно).",
    "core_pattern": "ДИНАМИЧЕСКИЙ ПАТТЕРН. Главная поведенческая петля (например: «Тревожная гиперкомпенсация через контроль»)."
  },
  "positive_core": {
    "natural_strengths": "ВНУТРЕННИЙ ФУНДАМЕНТ. Врожденные качества (энергия, фокус, склад ума), которые даны от природы.",
    "real_world_value": "ПРАКТИЧЕСКИЙ ВЫХОД. В каких именно ситуациях эта природа дает реальное преимущество.",
    "unique_trait": "РЕДКИЙ АКЦЕНТ. То, что реально отличает этого человека от 99% других с похожим типом.",
    "strength_chart": [
      { "name": "Название из списка", "value": "Оценка 0-100" }
    ]
  },
  "system_verdict": {
    "truth_bomb": "ЖЕСТКИЙ ИТОГ. Главная неудобная правда о человеке, основанная на фактах из постов. ИЗБЕГАЙ ОБЩИХ ФРАЗ типа «боится отвержения». Найди что-то уникальное, что следует только из его контента.",
    "main_conflict": "ВНУТРЕННИЙ РАЗРЫВ. Конкретное столкновение двух потребностей (например: «хочет признания экспертности, но постит только котиков»). Будь предельно конкретен.",
    "self_sabotage": "АКТИВНОЕ СОПРОТИВЛЕНИЕ. Каким именно уникальным действием он мешает себе достичь целей."
  },
  "cognitive_profile": {
    "thinking_style": "СТРУКТУРА МЫСЛИ. Как мозг обрабатывает информацию (системно, ассоциативно, интуитивно).",
    "decision_logic": "АЛГОРИТМ ВЫБОРА. На что человек опирается в момент принятия решения (логика, чувства, интуиция)."
  },
  "emotional_profile": {
    "core_emotions": ["3-4 доминирующих чувства (СТРОГО НА РУССКОМ)"],
    "regulation": "ЭМОЦИОНАЛЬНЫЙ ФИЛЬТР. Как человек подавляет или выражает свои чувства.",
    "stress_response": "РЕАКЦИЯ НА УГРОЗУ. Тип реакции (бей/беги/замри/сдавайся) и описание поведения."
  },
  "behavior_profile": {
    "patterns": [
      "ПОВЕДЕНЧЕСКИЙ ЦИКЛ: ситуация → реакция → результат (ОДНОЙ СТРОКОЙ)"
    ],
    "life_strategy": "ГЛОБАЛЬНАЯ СТРАТЕГИЯ. Контроль / Избегание / Борьба / Адаптация."
  },
  "weak_zones": {
    "risks": ["риски личности и возможные срывы"]
  }
`;

    // Premium schema parts
    const schemaPremium = `
    ,"biases": ["КОГНИТИВНЫЕ ИСКАЖЕНИЯ. 3-4 ошибки with обоснованием. Формат: «<Название на русском>: <проявление>». СТРОГО БЕЗ ЛАТИНИЦЫ."],
    "blind_spots": "ОШИБКИ ВОСПРИЯТИЯ. То, что человек КАТЕГОРИЧЕСКИ НЕ ВИДИТ в своем поведении."
  },
  "social_profile": {
    "communication_style": "СТИЛЬ ОБЩЕНИЯ. Прямота, манипулятивность, закрытость (2-3 слова).",
    "attachment": "ТИП ПРИВЯЗАННОСТИ. Надежный, избегающий, тревожный.",
    "trust_issues": "УРОВЕНЬ ДОВЕРИЯ. Степень открытости и подозрительности к миру.",
    "social_mask": "СОЦИАЛЬНАЯ РОЛЬ. Кем он хочет казаться в глазах окружающих."
  },
  "dark_profile": {
    "manipulation": "Уровень и излюбленные методы влияния на окружающих.",
    "toxicity": "Как человек отравляет среду вокруг себя (если это выражено).",
    "control": "Стремление к доминированию или подчинению.",
    "aggression": "Как проявляется злость (пассивно, открыто, холодно).",
    "empathy": "Уровень сопереживания (дефицит или излишек).",
    "dark_traits": "Главная теневая черта (нарциссизм / холодность / и др)."
  },
  "development_plan": {
    "growth_points": [
      "конкретные точки роста"
    ],
    "what_to_change": "что именно нужно изменить в поведении",
    "what_happens_if_not": "что будет если ничего не менять"
  },
  "personality_scores": {
    "logic": 0-100,
    "emotionality": 0-100,
    "control": 0-100,
    "adaptability": 0-100,
    "awareness": 0-100
  },
  "social_scores": {
    "empathy": 0-100,
    "openness": 0-100,
    "toxicity": 0-100,
    "manipulation": 0-100,
    "trust": 0-100
  },
`;

    // Close the objects for simple/complex
    const schemaEnd = isPaid
      ? `${schemaPremium} "confidence": "инфо о точности" }`
      : `}, "confidence": "инфо о точности" }`;

    const fullSchemaText = `{ ${schemaCore} ${schemaEnd} }`;

    const megaPrompt = `${promptHeader}
==================================================
📊 ВЕРНИ JSON:
==================================================
${fullSchemaText}

==================================================
📊 БЛОК: ГРАФИК СИЛЬНЫХ СТОРОН
==================================================
Выбери ТОП-3 стороны: Аналитика, Эмпатия, Самоконтроль, Гибкость, Стратегичность, Наблюдательность, Коммуникация, Решительность, Креативность, Устойчивость. Оценка 0-100.

ДАННЫЕ ПРОФИЛЯ:
Nickname: @${nickname}
Bio: ${data.bio}
Posts:
${postsText || 'Посты не найдены.'}`;

    let analysisResult;
    let lastError;

    const startTimeBaseten = Date.now();
    // --- BASETEN CALL WITH KEY ROTATION ---
    for (let i = 0; i < basetenKeys.length; i++) {
      const apiKey = basetenKeys[i];
      try {
        console.log(`Attempting Baseten analysis with Key ${i + 1} (model: ${modelName})...`);

        const response = await axios.post('https://inference.baseten.co/v1/chat/completions', {
          model: modelName,
          messages: [
            {
              role: "system",
              content: "Ты — профессиональный психолог-профайлер. Твоя задача — провести глубокий анализ личности по текстам постов. СТРОГО соблюдай заданную структуру JSON и пиши только на РУССКОМ языке. Не используй markdown разметку, возвращай только чистый объект JSON."
            },
            {
              role: "user",
              content: megaPrompt
            }
          ],
          response_format: { type: "json_object" }
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        });

        const text = response.data.choices[0].message.content;
        console.log(`Baseten call successful (Key ${i + 1}).`);

        try {
          // Robust JSON extraction (if LLM wrapped in backticks)
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : text);
          break; // Success!
        } catch (parseError) {
          console.error(`Failed to parse Baseten JSON output from Key ${i + 1}:`, parseError);
          console.log("Raw text was:", text);
          lastError = new Error("Invalid JSON format from AI");
          continue;
        }
      } catch (error) {
        lastError = error;
        const status = error.response?.status || error.status;
        console.warn(`Baseten Key ${i + 1} failed: ${error.message} (Status: ${status})`);

        if (status === 429 || [500, 502, 503, 504].includes(status)) {
          console.log(`Trying next Baseten key...`);
          continue;
        }
        continue;
      }
    }

    console.log(`AI Phase: ${Date.now() - startTimeBaseten}ms`);

    if (!analysisResult) {
      console.error("All Baseten keys failed");
      throw lastError || new Error("All AI models are unavailable");
    }

    // --- ТРЕКИНГ СТАТИСТИКИ ---
    try {
      console.log(`Debug stats: nickname=${nickname}, telegramId=${telegramId}`);
      // Возвращаем await, так как в serverless-среде без него соединение разрывается (SocketError)
      await trackCheck(telegramId, nickname).catch(e => console.error("trackCheck error:", e));

      // Если статус оплаты еще не был получен в блоке техработ, получаем его сейчас
      if (telegramId && !isPaid) {
        const checkStatus = await checkUserStatus(telegramId);
        isPaid = checkStatus.isPaid;
      }
    } catch (e) {
      console.warn("Failed to log check stats or check status:", e);
    }

    // -------------------------------------------------------------------------
    // ПОДМЕНА ДАННЫХ ДЛЯ БЕСПЛАТНЫХ ПОЛЬЗОВАТЕЛЕЙ (Безопасность/Оптимизация)
    // -------------------------------------------------------------------------
    if (!isPaid && analysisResult) {
      // 1. Цифровые показатели (заглушка)
      analysisResult.personality_scores = { logic: 50, emotionality: 50, control: 50, adaptability: 50, awareness: 50 };
      analysisResult.social_scores = { empathy: 50, openness: 50, trust: 50, toxicity: 50, manipulation: 50 };

      // 2. Текстовые блоки (заглушка для красоты UI)
      if (!analysisResult.positive_core) {
        analysisResult.positive_core = {
          psychotype: "Анализируется...",
          summary: "Информация формируется...",
          natural_strengths: "Доступно после обработки",
          strength_chart: []
        };
      }

      if (analysisResult.cognitive_profile) {
        analysisResult.cognitive_profile.biases = ["Доступно в Premium версии"];
        analysisResult.cognitive_profile.blind_spots = "Анализ 'Слепых пятен' доступен подписчикам";
      }

      // Эти блоки теперь считаются CORE и анализируются для всех:
      // - emotional_profile
      // - behavior_profile
      // - weak_zones
      // - positive_core

      analysisResult.social_profile = {
        communication_style: "Скрыто",
        attachment: "Скрыто",
        trust_issues: "Скрыто",
        social_mask: "Скрыто"
      };

      analysisResult.dark_profile = {
        manipulation: "Заблокировано",
        toxicity: "Заблокировано",
        control: "Заблокировано",
        aggression: "Заблокировано",
        empathy: "Заблокировано",
        dark_traits: "Теневой профиль доступен в Premium"
      };

      analysisResult.development_plan = {
        growth_points: ["План развития доступен в Premium"],
        what_to_change: "Данные ограничены",
        what_happens_if_not: "Данные ограничены"
      };
    }

    console.log(`Full Execution: ${Date.now() - startTimeFull}ms`);
    return res.status(200).json({
      nickname: data.nickname,
      avatar: data.avatar,
      posts_found: usedPosts.length,
      posts: usedPosts,
      bio: data.bio || null,
      isPaid: isPaid, // Передаем статус оплаты на фронтенд
      ...analysisResult
    });

  } catch (error) {
    if (typeof startTimeFull !== 'undefined') {
      console.log(`Full Execution (Err): ${Date.now() - startTimeFull}ms`);
    }
    console.error('Final handler error:', error);

    let userMessage = `Ошибка сервера: ${error.message}`;
    let errorCode = 'fatal_error';

    if (error.status === 429) {
      errorCode = 'rate_limit';
      userMessage = 'Превышен лимит запросов к ИИ. Пожалуйста, подождите немного.';
    } else if (error.status === 503 || error.status === 502 || error.status === 500) {
      errorCode = 'ai_overloaded';
      userMessage = 'Сервис ИИ временно перегружен. Попробуйте через минуту.';
    } else if (error.response?.status === 404) {
      errorCode = 'profile_not_found';
      userMessage = 'Профиль не найден в Threads. Проверьте правильность написания никнейма.';
    }

    return res.status(200).json({
      error: errorCode,
      message: userMessage
    });
  }
}