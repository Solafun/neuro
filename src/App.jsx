import React, { useState, useEffect } from 'react';
import { analyzeProfile } from './services/api';
import ResultScreen from './components/ResultScreen';
import MainScreen from './components/MainScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import AccessDenied from './components/AccessDenied';
import SettingsScreen from './components/SettingsScreen';
import SpatialBackground from './components/SpatialBackground';
import { checkMaintenance } from './services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { I18nProvider, useI18n } from './i18n/I18nContext';

function AppContent() {
  const { t, language } = useI18n();
  const [nickname, setNickname] = useState('');
  const [appState, setAppState] = useState('init'); // 'init', 'idle', 'loading', 'result', 'error', 'maintenance', 'denied', 'settings'
  const [previousState, setPreviousState] = useState('idle');
  const [result, setResult] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [userChecks, setUserChecks] = useState({ freeChecks: 1, paidChecks: 0, isPaid: false });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();

      if (tg.isVersionAtLeast('7.10') && tg.requestFullscreen) {
        try {
          tg.requestFullscreen();
        } catch (e) {
          console.warn("Fullscreen not supported by this client");
        }
      }

      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS && tg.isVersionAtLeast('7.7') && tg.disableVerticalSwipe) {
        try {
          tg.disableVerticalSwipe();
        } catch (e) {
          console.warn("DisableVerticalSwipe not supported");
        }
      }

      tg.setHeaderColor('#F2F2F7');
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

    const fetchMaintenanceStatus = async (retryCount = 0) => {
      const tg = window.Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      const telegramId = user?.id;

      try {
        if (!telegramId && tg && (tg.initData || tg.initDataUnsafe) && retryCount < 5) {
          setTimeout(() => fetchMaintenanceStatus(retryCount + 1), 1000);
          return;
        }

        const isTelegram = tg && tg.initData && tg.initData.length > 0;
        if (!isTelegram) {
          setAppState('denied');
          return;
        }

        const data = await checkMaintenance(telegramId, language);

        if (data.isMaintenance) {
          setIsMaintenance(true);
          setMaintenanceMessage(data.maintenanceMessage || "");
          setAppState('maintenance');
        } else {
          setAppState('idle');
        }
        if (data.freeChecks !== undefined || data.paidChecks !== undefined) {
          setUserChecks({
            freeChecks: data.freeChecks ?? 0,
            paidChecks: data.paidChecks ?? 0,
            isPaid: data.isPaid || false
          });
        }
      } catch (err) {
        setAppState('idle');
      }
    };
    fetchMaintenanceStatus();
  }, []);

  // Native UI handling (SettingsButton, BackButton)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const settingsButton = tg.SettingsButton;
    const backButton = tg.BackButton;

    const onSettingsClick = () => {
      setPreviousState(appState);
      setAppState('settings');
    };

    const onBackClick = () => {
      if (appState === 'settings') {
        setAppState(prev => (prev === 'settings' ? previousState : 'idle'));
      } else {
        handleReset();
      }
    };

    // Settings Button Visibility
    if (['idle', 'result', 'error'].includes(appState)) {
      settingsButton.show();
      settingsButton.onClick(onSettingsClick);
    } else {
      settingsButton.hide();
      settingsButton.offClick(onSettingsClick);
    }

    // Back Button Visibility
    if (['result', 'error', 'settings'].includes(appState)) {
      backButton.show();
      backButton.onClick(onBackClick);
    } else {
      backButton.hide();
      backButton.offClick(onBackClick);
    }

    return () => {
      settingsButton.offClick(onSettingsClick);
      backButton.offClick(onBackClick);
    };
  }, [appState, previousState]);

  const handleAnalyze = async (inputNick) => {
    const cleanNick = (inputNick || nickname).replace('@', '').trim();
    if (!cleanNick) return;

    setNickname(cleanNick);
    setAppState('loading');
    setResult(null);

    try {
      const tg = window.Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id;

      const data = await analyzeProfile(cleanNick, telegramId, language);

      if (data.error) {
        if (data.error === 'no_checks') {
          setResult({
            message: data.message || t('limit_reached'),
            isNoChecks: true,
            isPaid: data.isPaid
          });
        } else {
          setResult(data);
        }
        setAppState('error');
        return;
      }

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
      setResult({ message: error.message || t('error_server') });
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

          {appState === 'settings' && (
            <SettingsScreen
              key="settings"
              onBack={() => setAppState(previousState)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;
