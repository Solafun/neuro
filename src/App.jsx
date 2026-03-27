import React, { useState, useEffect } from 'react';
import { analyzeProfile } from './services/api';
import ResultScreen from './components/ResultScreen';
import MainScreen from './components/MainScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import AccessDenied from './components/AccessDenied';
import SpatialBackground from './components/SpatialBackground';
import { checkMaintenance } from './services/api';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const [nickname, setNickname] = useState('');
  const [appState, setAppState] = useState('init'); // Новый статус - инициализация
  const [result, setResult] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [userChecks, setUserChecks] = useState({ freeChecks: 1, paidChecks: 0, isPaid: false });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();

      // Попытка войти в полноэкранный режим (для новых версий Telegram 7.10+)
      if (tg.isVersionAtLeast('7.10') && tg.requestFullscreen) {
        try {
          tg.requestFullscreen();
        } catch (e) {
          console.warn("Fullscreen not supported by this client");
        }
      }

      // Отключаем свайп вниз для закрытия (Только для iOS, на Android это часто ломает скролл)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS && tg.isVersionAtLeast('7.7') && tg.disableVerticalSwipe) {
        try {
          tg.disableVerticalSwipe();
        } catch (e) {
          console.warn("DisableVerticalSwipe not supported");
        }
      }


      tg.setHeaderColor('#F2F2F7'); // Верхняя панель светлая (под цвет фона)

      // Фон за клавиатурой и нижней панелью - в цвет нашей подложки
      const bottomColor = '#F2F2F7';

      tg.setBackgroundColor(bottomColor);

      if (tg.isVersionAtLeast('7.10') && tg.setBottomBarColor) {
        try {
          tg.setBottomBarColor(bottomColor);
        } catch (e) {
          console.warn("setBottomBarColor not supported");
        }
      }
    }

    // Проверка режима тех. работ при загрузке
    const fetchMaintenanceStatus = async (retryCount = 0) => {
      const tg = window.Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      const telegramId = user?.id;

      console.log(`[MaintenanceCheck] Attempt ${retryCount + 1}: user=${user ? JSON.stringify(user) : 'null'}, id=${telegramId}`);

      try {
        // Если ID еще нет, но мы в телеграме - пробуем подождать (до 5 раз по 1 сек)
        if (!telegramId && tg && (tg.initData || tg.initDataUnsafe) && retryCount < 5) {
          console.log(`[MaintenanceCheck] Telegram ID not ready, retrying in 1000ms...`);
          setTimeout(() => fetchMaintenanceStatus(retryCount + 1), 1000);
          return;
        }

        console.log(`[MaintenanceCheck] Proceeding with ID: ${telegramId || 'guest'}`);

        // ПРОВЕРКА ПЛАТФОРМЫ: блокируем обычные браузеры
        const isTelegram = tg && tg.initData && tg.initData.length > 0;
        if (!isTelegram) {
          console.warn("[AccessCheck] Unauthorized access from outside Telegram.");
          setAppState('denied');
          return;
        }

        const data = await checkMaintenance(telegramId);
        console.log("[MaintenanceCheck] API Result:", data);

        if (data.isMaintenance) {
          setIsMaintenance(true);
          setMaintenanceMessage(data.maintenanceMessage || "");
          setAppState('maintenance');
        } else {
          setAppState('idle');
        }
        // Сохраняем данные о проверках
        if (data.freeChecks !== undefined || data.paidChecks !== undefined) {
          setUserChecks({
            freeChecks: data.freeChecks ?? 0,
            paidChecks: data.paidChecks ?? 0,
            isPaid: data.isPaid || false
          });
        }
      } catch (err) {
        console.error("[MaintenanceCheck] Error:", err);
        setAppState('idle'); // В случае ошибки пускаем в приложение
      }
    };
    fetchMaintenanceStatus();
  }, []);

  // Telegram Back Button logic
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const backButton = tg.BackButton;

    if (appState === 'result' || appState === 'error') {
      backButton.show();
      const onBackClick = () => {
        handleReset();
      };
      backButton.onClick(onBackClick);

      return () => {
        backButton.offClick(onBackClick);
      };
    } else {
      backButton.hide();
    }
  }, [appState]);

  const handleAnalyze = async (inputNick) => {
    const cleanNick = (inputNick || nickname).replace('@', '').trim();
    if (!cleanNick) return;

    setNickname(cleanNick);
    setAppState('loading');
    setResult(null);

    try {
      const tg = window.Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id;

      const data = await analyzeProfile(cleanNick, telegramId);

      if (data.error) {
        if (data.error === 'no_checks') {
          setResult({
            message: data.message || 'Лимит проверок исчерпан.',
            isNoChecks: true,
            isPaid: data.isPaid
          });
        } else {
          setResult(data);
        }
        setAppState('error');
        return;
      }

      // Успешный результат - обновляем состояние лимитов
      if (data.freeChecks !== undefined || data.paidChecks !== undefined) {
        setUserChecks(prev => ({
          ...prev,
          freeChecks: data.freeChecks !== undefined ? data.freeChecks : prev.freeChecks,
          paidChecks: data.paidChecks !== undefined ? data.paidChecks : prev.paidChecks
        }));
      }

      setResult(data);
      setAppState('result');
    } catch (error) {
      console.error("Analysis failed:", error);
      setResult({ message: error.message || "Произошла ошибка при вызове сервера." });
      setAppState('error');
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setNickname('');
    setResult(null);
  };

  return (
    <>
      <SpatialBackground auraColor={result?.aura?.color} />
      <div className="app-container">
        <AnimatePresence mode="wait">
          {appState === 'init' && (
            <motion.div
              key="init"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full w-full"
            >
              <div className="simple-spinner"></div>
            </motion.div>
          )}

          {appState === 'idle' && (
            <MainScreen
              key="main"
              nickname={nickname}
              setNickname={setNickname}
              onAnalyze={handleAnalyze}
              userChecks={userChecks}
            />
          )}

          {appState === 'loading' && (
            <LoadingScreen key="loading" />
          )}

          {appState === 'result' && result && (
            <ResultScreen
              key="result"
              result={result}
              onReset={handleReset}
            />
          )}

          {appState === 'error' && (
            <ErrorScreen
              key="error"
              message={result?.message}
              isNoChecks={result?.isNoChecks}
              onReset={handleReset}
            />
          )}

          {appState === 'maintenance' && (
            <MaintenanceScreen
              key="maintenance"
              message={maintenanceMessage}
            />
          )}

          {appState === 'denied' && (
            <AccessDenied key="denied" />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;
