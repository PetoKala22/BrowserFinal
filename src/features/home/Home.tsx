import React, { useCallback, useMemo, useRef, useState } from 'react';
import { BrowserContent, BrowserContentHandle } from '@/components/Browser/BrowserContent';
import { HistoryPage } from '@/components/Browser/HistoryPage';
import { RightSidebar } from '@/components/Browser/RightSidebar';
import { SettingsPage } from '@/components/Browser/SettingsPage';
import { TabBar } from '@/components/Browser/TabBar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { AppSettings, Layout, SearchEngine, Tab, Theme } from '@/lib/types';
import { INITIAL_TABS } from '@/lib/constants';
import { BrowserToolbar } from '@/features/home/components/BrowserToolbar';
import { UnsavedChangesDialog } from '@/features/home/components/UnsavedChangesDialog';
import { useSettings } from '@/features/home/hooks/useSettings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.SYSTEM,
  searchEngine: SearchEngine.GOOGLE,
  customSearchUrl: '',
  layout: Layout.GENERIC
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
    theme,
    setTheme,
    searchEngine,
    setSearchEngine,
    customSearchUrl,
    setCustomSearchUrl,
    layout,
    setLayout,
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

  const handleSwitchTab = useCallback(
    (id: string) => {
      requestCloseSettings(() => {
        setHistoryOpen(false);
        setActiveTabId(id);
      });
    },
    [requestCloseSettings]
  );

  const handleNewTab = useCallback(() => {
    const newId = Math.random().toString(36).slice(2, 9);
    const newTab: Tab = {
      id: newId,
      title: 'Start Page',
      url: 'browser://welcome',
      loading: false,
      canGoBack: false,
      canGoForward: false
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  }, []);

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
    <div className="relative isolate flex h-screen w-screen flex-col overflow-hidden text-sm select-none font-sans text-neutral-800 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-900">
      {layout === Layout.GENERIC && (
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
            className={`electron-no-drag overflow-hidden transition-[opacity,transform,max-height] duration-200 ease-out ${
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
              onNewTab={handleNewTab}
            />
          </div>
        </div>
      )}

      <div className="relative z-50 flex flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onOpenHistory={handleOpenHistory}
          onOpenSettings={handleOpenSettings}
          historyActive={historyOpen}
          settingsActive={settingsOpen}
          position="left"
        />

        <main className="flex-1 relative bg-transparent overflow-hidden">
          {!settingsOpen && (
            <BrowserContent
              ref={browserRef}
              tabs={tabs}
              activeTabId={activeTabId}
              onTabUpdate={handleTabUpdate}
            />
          )}
          {historyOpen && (
            <div className="absolute inset-0 z-10">
              <HistoryPage />
            </div>
          )}
          {settingsOpen && (
            <div className="absolute inset-0 z-10">
              <SettingsPage
                theme={theme}
                onThemeChange={setTheme}
                layout={layout}
                onLayoutChange={setLayout}
                searchEngine={searchEngine}
                onSearchEngineChange={setSearchEngine}
                customSearchUrl={customSearchUrl}
                onCustomSearchUrlChange={setCustomSearchUrl}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSavingSettings}
                onSave={handleSaveSettings}
              />
            </div>
          )}
        </main>

        {layout === Layout.SIDEBAR && (
          <RightSidebar
            tabs={tabs}
            activeTabId={activeTabId}
            address={activeTab.url}
            loading={activeTab.loading}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            sidebarOpen={sidebarOpen}
            searchEngine={searchEngine}
            customSearchUrl={customSearchUrl}
            onNavigate={handleNavigate}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            onReload={handleReload}
            onStop={handleStop}
            onSwitchTab={handleSwitchTab}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onToggleLeftSidebar={handleSidebarToggle}
          />
        )}
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
