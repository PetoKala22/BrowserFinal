import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserContent, BrowserContentHandle } from '@/components/Browser/BrowserContent';
import { HistoryPage } from '@/components/Browser/HistoryPage';
import { SettingsPage } from '@/components/Browser/SettingsPage';
import { TabBar } from '@/components/Browser/TabBar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { AppSettings, SearchEngine, Tab, Theme } from '@/lib/types';
import { INITIAL_TABS } from '@/lib/constants';
import { BrowserToolbar } from '@/features/home/components/BrowserToolbar';
import { UnsavedChangesDialog } from '@/features/home/components/UnsavedChangesDialog';
import { useSettings } from '@/features/home/hooks/useSettings';
import { WallpaperNotice } from '@/features/home/components/WallpaperNotice';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.SYSTEM,
  searchEngine: SearchEngine.GOOGLE,
  customSearchUrl: '',
  backgroundType: 'wallpaper',
  wallpaper: '',
  wallpaperColor: '',
  wallpaperBlur: false
};

const isInternalUrl = (url: string) => url.startsWith('browser://');

const Home: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_TABS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastExternalUrlById, setLastExternalUrlById] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmUnsavedOpen, setConfirmUnsavedOpen] = useState(false);
  const [pendingSettingsAction, setPendingSettingsAction] = useState<(() => void) | null>(null);
  const browserRef = useRef<BrowserContentHandle>(null);

  const {
    searchEngine,
    setSearchEngine,
    customSearchUrl,
    setCustomSearchUrl,
    backgroundType,
    setBackgroundType,
    wallpaper,
    setWallpaper,
    wallpaperColor,
    setWallpaperColor,
    wallpaperBlur,
    setWallpaperBlur,
    savedSettings,
    setSavedSettings,
    hasUnsavedChanges,
    isSavingSettings,
    applySettings,
    handleSaveSettings
  } = useSettings(DEFAULT_SETTINGS);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );
  const canGoBack = activeTab?.canGoBack ?? false;
  const canGoForward = activeTab?.canGoForward ?? false;

  const trackExternalUrl = useCallback((tabId: string, url: string) => {
    if (isInternalUrl(url)) return;
    setLastExternalUrlById((prev) => {
      if (prev[tabId] === url) return prev;
      return { ...prev, [tabId]: url };
    });
  }, []);

  const requestCloseSettings = useCallback(
    (action?: () => void) => {
      if (!settingsOpen) {
        action?.();
        return;
      }
      if (!hasUnsavedChanges) {
        setSettingsOpen(false);
        action?.();
        return;
      }
      setPendingSettingsAction(() => action || null);
      setConfirmUnsavedOpen(true);
    },
    [hasUnsavedChanges, settingsOpen]
  );

  const navigateTo = useCallback(
    (url: string) => {
      trackExternalUrl(activeTabId, url);
      setHistoryOpen(false);
      setSettingsOpen(false);
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, url, loading: true, title: url.replace('https://', '').split('/')[0] }
            : tab
        )
      );
      browserRef.current?.loadUrl(url);
    },
    [activeTabId, trackExternalUrl]
  );

  const handleNavigate = useCallback(
    (url: string) => {
      requestCloseSettings(() => navigateTo(url));
    },
    [navigateTo, requestCloseSettings]
  );

  const handleSidebarToggle = useCallback(() => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      return;
    }

    const performClose = () => {
      if (isInternalUrl(activeTab.url)) {
        const previousUrl = lastExternalUrlById[activeTabId];
        if (previousUrl) {
          navigateTo(previousUrl);
        }
      }
      setHistoryOpen(false);
      setSettingsOpen(false);
      setSidebarOpen(false);
    };

    requestCloseSettings(performClose);
  }, [activeTab, activeTabId, lastExternalUrlById, navigateTo, requestCloseSettings, sidebarOpen]);

  const handleOpenHistory = useCallback(() => {
    requestCloseSettings(() => {
      setHistoryOpen(true);
    });
  }, [requestCloseSettings]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    setHistoryOpen(false);
  }, []);

  const handleCloseSettings = useCallback(() => {
    requestCloseSettings();
  }, [requestCloseSettings]);

  const handleSwitchTab = useCallback(
    (id: string) => {
      requestCloseSettings(() => {
        setHistoryOpen(false);
        setActiveTabId(id);
      });
    },
    [requestCloseSettings]
  );

  const createTab = useCallback((url: string) => {
    const isInternal = isInternalUrl(url);
    const title = isInternal
      ? 'Start Page'
      : url.replace('https://', '').replace('http://', '').split('/')[0];
    const newId = Math.random().toString(36).slice(2, 9);
    const newTab: Tab = {
      id: newId,
      title,
      url,
      loading: !isInternal,
      canGoBack: false,
      canGoForward: false
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  }, []);

  const handleNewTab = useCallback(() => {
    createTab('browser://welcome');
  }, [createTab]);

  const handleOpenNewTab = useCallback(
    (url: string) => {
      createTab(url);
    },
    [createTab]
  );

  useEffect(() => {
    if (!window.electronAPI?.onNewWindow) return undefined;
    return window.electronAPI.onNewWindow(handleOpenNewTab);
  }, [handleOpenNewTab]);

  const handleCloseTab = useCallback(
    (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setTabs((prev) => {
        if (prev.length === 1) return prev;
        const nextTabs = prev.filter((tab) => tab.id !== id);
        if (id === activeTabId) {
          setActiveTabId(nextTabs[nextTabs.length - 1].id);
        }
        return nextTabs;
      });
    },
    [activeTabId]
  );

  const handleTabUpdate = useCallback(
    (id: string, patch: Partial<Tab>) => {
      if (patch.url) trackExternalUrl(id, patch.url);
      setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
    },
    [trackExternalUrl]
  );

  const handleGoBack = useCallback(() => browserRef.current?.goBack(), []);
  const handleGoForward = useCallback(() => browserRef.current?.goForward(), []);
  const handleReload = useCallback(() => browserRef.current?.reload(), []);
  const handleStop = useCallback(() => browserRef.current?.stop(), []);

  const handleDiscardChanges = useCallback(() => {
    applySettings(savedSettings);
    setConfirmUnsavedOpen(false);
    setSettingsOpen(false);
    const action = pendingSettingsAction;
    setPendingSettingsAction(null);
    action?.();
  }, [applySettings, pendingSettingsAction, savedSettings]);

  const handleStayOnSettings = useCallback(() => {
    setConfirmUnsavedOpen(false);
    setPendingSettingsAction(null);
  }, []);

  const handleSaveAndContinue = useCallback(async () => {
    await handleSaveSettings();
    setConfirmUnsavedOpen(false);
    setSettingsOpen(false);
    const action = pendingSettingsAction;
    setPendingSettingsAction(null);
    action?.();
  }, [handleSaveSettings, pendingSettingsAction]);

  return (
    <div className="relative isolate flex h-screen w-screen flex-col overflow-hidden text-sm select-none font-sans text-[color:var(--ui-text)] bg-[color:var(--ui-base)]">
      {backgroundType === 'wallpaper' && wallpaper && (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className={`h-full w-full bg-center bg-cover ${
              wallpaperBlur ? 'blur-lg scale-105' : ''
            }`}
            style={{ backgroundImage: `url(${wallpaper})` }}
          />
          <div className="absolute inset-0 bg-[color:var(--ui-wallpaper-overlay)]" />
        </div>
      )}
      <div
        className={
          '\n        flex flex-col flex-shrink-0 z-50 transition-colors duration-300\n        bg-transparent\n        electron-drag\n      '
        }
      >
        <BrowserToolbar
          sidebarOpen={sidebarOpen}
          onSidebarToggle={handleSidebarToggle}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          address={activeTab.url}
          onNavigate={handleNavigate}
          onReload={handleReload}
          onStop={handleStop}
          loading={activeTab.loading}
          searchEngine={searchEngine}
          customSearchUrl={customSearchUrl}
          onNewTab={handleNewTab}
        />

        <div
          className={`electron-no-drag bg-transparent overflow-hidden transition-[opacity,transform,max-height] duration-200 ease-out ${
            tabs.length > 1
              ? 'opacity-100 max-h-16 translate-y-0'
              : 'opacity-0 max-h-0 -translate-y-1 pointer-events-none'
          }`}
        >
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitch={handleSwitchTab}
            onClose={handleCloseTab}
          />
        </div>
      </div>

      <div className="relative z-50 flex flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onOpenHistory={handleOpenHistory}
          onOpenSettings={handleOpenSettings}
          historyActive={historyOpen}
          settingsActive={settingsOpen}
          position="left"
        />

        <main className="flex-1 relative bg-transparent overflow-hidden rounded-t-2xl">
          {!settingsOpen && (
            <div className="h-full w-full">
              <BrowserContent
                ref={browserRef}
                tabs={tabs}
                activeTabId={activeTabId}
                onTabUpdate={handleTabUpdate}
                onOpenNewTab={handleOpenNewTab}
              />
            </div>
          )}
          {historyOpen && (
            <div className="absolute inset-0 z-10">
              <HistoryPage />
            </div>
          )}
          {settingsOpen && (
            <div className="absolute inset-0 z-10">
              <SettingsPage
                wallpaper={wallpaper}
                onWallpaperChange={setWallpaper}
                wallpaperColor={wallpaperColor}
                onWallpaperColorChange={setWallpaperColor}
                backgroundType={backgroundType}
                onBackgroundTypeChange={setBackgroundType}
                wallpaperBlur={wallpaperBlur}
                onWallpaperBlurChange={setWallpaperBlur}
                searchEngine={searchEngine}
                onSearchEngineChange={setSearchEngine}
                customSearchUrl={customSearchUrl}
                onCustomSearchUrlChange={setCustomSearchUrl}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSavingSettings}
                onSave={handleSaveSettings}
                onClose={handleCloseSettings}
              />
            </div>
          )}
        </main>

      </div>

      <div className="electron-no-drag absolute bottom-6 right-6 z-50">
        <WallpaperNotice onOpenSettings={handleOpenSettings} />
      </div>

      {confirmUnsavedOpen && (
        <UnsavedChangesDialog
          onStay={handleStayOnSettings}
          onDiscard={handleDiscardChanges}
          onSaveAndContinue={handleSaveAndContinue}
        />
      )}
    </div>
  );
};

export default Home;
