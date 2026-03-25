import React, { useState, useEffect } from 'react';
import { analyzeProfile } from './services/api';
import ResultScreen from './components/ResultScreen';
import MainScreen from './components/MainScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import SpatialBackground from './components/SpatialBackground';
import { checkMaintenance } from './services/api';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [nickname, setNickname] = useState('');
  const [appState, setAppState] = useState('idle'); // idle, loading, result, error, maintenance
  const [result, setResult] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);

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
    const fetchMaintenanceStatus = async () => {
      const maintenance = await checkMaintenance();
      if (maintenance) {
        setIsMaintenance(true);
        setAppState('maintenance');
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
        setAppState('error');
        setResult(data);
        return;
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
      <SpatialBackground />
      <div className="app-container">
        <AnimatePresence mode="wait">
          {appState === 'idle' && (
            <MainScreen
              key="main"
              nickname={nickname}
              setNickname={setNickname}
              onAnalyze={handleAnalyze}
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
              onReset={handleReset}
            />
          )}

          {appState === 'maintenance' && (
            <MaintenanceScreen key="maintenance" />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;
