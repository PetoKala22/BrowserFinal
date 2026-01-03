import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BrowserContent, BrowserContentHandle } from '@/components/Browser/BrowserContent';
import { HistoryPage } from '@/components/Browser/HistoryPage';
import { AddressBar } from '@/components/Browser/AddressBar';
import { SettingsPage } from '@/components/Browser/SettingsPage';
import { TabBar } from '@/components/Browser/TabBar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { SuggestionsBar } from '@/components/Browser/Suggestions';
import { WindowControls } from '@/components/Browser/WindowControls';
import { AppSettings, HistoryItem, SearchEngine, Tab, Theme } from '@/lib/types';
import { INITIAL_TABS } from '@/lib/constants';
import { BrowserToolbar } from '@/features/home/components/BrowserToolbar';
import { UnsavedChangesDialog } from '@/features/home/components/UnsavedChangesDialog';
import { useSettings } from '@/features/home/hooks/useSettings';
import { WallpaperNotice } from '@/features/home/components/WallpaperNotice';
import { AdBlockWidget } from '@/features/home/components/AdBlockWidget';
import { OnboardingFlow } from '@/features/home/components/OnboardingFlow';

const WALLPAPER_NOTICE_SEEN_KEY = 'wallpaperNoticeSeen';
const WALLPAPER_NOTICE_TARGET_KEY = 'wallpaperNoticeTarget';
const WALLPAPER_NOTICE_COUNT_KEY = 'wallpaperNoticeVisitCount';
const SHOW_ONBOARDING_EVERY_START = false;
const ONBOARDING_SEEN_KEY = 'onboardingSeen';

const DEFAULT_SETTINGS: AppSettings = {
  theme: Theme.SYSTEM,
  searchEngine: SearchEngine.GOOGLE,
  customSearchUrl: '',
  backgroundType: 'wallpaper',
  wallpaper: '',
  wallpaperColor: '',
  wallpaperBlur: false,
  adBlockEnabled: true
};

const isInternalUrl = (url: string) => url.startsWith('browser://');
const sortHistoryItems = (items: HistoryItem[]) =>
  [...items].sort((a, b) => b.timestamp - a.timestamp);
const getTabTitleFromUrl = (url: string) => {
  if (isInternalUrl(url)) return 'Start Page';
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname;
    return hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
};

const Home: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>(INITIAL_TABS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addressBarFocused, setAddressBarFocused] = useState(false);
  const [lastExternalUrlById, setLastExternalUrlById] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    'appearance' | 'general' | 'search' | 'privacy' | 'advanced'
  >('appearance');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [adBlockOpen, setAdBlockOpen] = useState(false);
  const [adBlockBlockedCount, setAdBlockBlockedCount] = useState(0);
  const [confirmUnsavedOpen, setConfirmUnsavedOpen] = useState(false);
  const [pendingSettingsAction, setPendingSettingsAction] = useState<(() => void) | null>(null);
  const [shieldRect, setShieldRect] = useState<DOMRect | null>(null);
  const [showWallpaperNotice, setShowWallpaperNotice] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    if (SHOW_ONBOARDING_EVERY_START) return true;
    return localStorage.getItem(ONBOARDING_SEEN_KEY) !== 'true';
  });
  const [onboardingClosing, setOnboardingClosing] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const lastActiveUrlRef = useRef<string | null>(null);
  const onboardingTimerRef = useRef<number | null>(null);
  const onboardingIntroTimerRef = useRef<number | null>(null);
  const adBlockRef = useRef<HTMLDivElement | null>(null);
  const shieldRef = useRef<HTMLDivElement | null>(null);
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
    adBlockEnabled,
    setAdBlockEnabled,
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
  const historySorted = useMemo(() => {
    if (historyItems.length <= 1) return historyItems;
    return [...historyItems].sort((a, b) => b.timestamp - a.timestamp);
  }, [historyItems]);
  const topSites = useMemo(() => {
    const byHost = new Map<
      string,
      { url: string; title: string; count: number; lastVisited: number }
    >();
    historyItems.forEach((item) => {
      if (!item.url || item.url.startsWith('browser://')) return;
      let hostname = '';
      try {
        hostname = new URL(item.url).hostname;
      } catch {
        return;
      }
      if (!hostname) return;
      const existing = byHost.get(hostname);
      const nextCount = (existing?.count ?? 0) + 1;
      const nextLast = Math.max(existing?.lastVisited ?? 0, item.timestamp ?? 0);
      const nextUrl = !existing || item.timestamp >= (existing.lastVisited ?? 0)
        ? item.url
        : existing.url;
      const nextTitle = !existing || item.timestamp >= (existing.lastVisited ?? 0)
        ? item.title || item.url
        : existing.title;
      byHost.set(hostname, {
        url: nextUrl,
        title: nextTitle,
        count: nextCount,
        lastVisited: nextLast
      });
    });
    return Array.from(byHost.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastVisited - a.lastVisited;
      })
      .slice(0, 4)
      .map((item, index) => ({
        id: `top-${index}-${item.url}`,
        label: item.title || item.url,
        value: item.url,
        hint: 'Top site' as const,
        type: 'top' as const
      }));
  }, [historyItems]);
  const canGoBack = Boolean(
    activeTab?.canGoBack ||
      (activeTab
        ? isInternalUrl(activeTab.url)
          ? Boolean(lastExternalUrlById[activeTabId])
          : true
        : false)
  );
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
            ? { ...tab, url, loading: true, title: getTabTitleFromUrl(url) }
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
    setSettingsSection('appearance');
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.getAdblockStats) return;
    let unsubscribe: (() => void) | undefined;
    window.electronAPI
      .getAdblockStats()
      .then((stats) => {
        if (typeof stats?.blocked === 'number') {
          setAdBlockBlockedCount(stats.blocked);
        }
      })
      .catch(() => undefined);

    if (window.electronAPI.onAdblockStats) {
      unsubscribe = window.electronAPI.onAdblockStats((stats) => {
        if (typeof stats?.blocked === 'number') {
          setAdBlockBlockedCount(stats.blocked);
        }
      });
    }

    return () => {
      unsubscribe?.();
    };
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
    const title = isInternal ? 'Start Page' : getTabTitleFromUrl(url);
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

  useEffect(() => {
    const handleOpenSettingsEvent = (event: Event) => {
      const custom = event as CustomEvent<{ section?: 'appearance' | 'general' | 'search' | 'privacy' | 'advanced' }>;
      setSettingsOpen(true);
      setHistoryOpen(false);
      if (custom.detail?.section) {
        setSettingsSection(custom.detail.section);
      }
    };
    window.addEventListener('browser-open-settings', handleOpenSettingsEvent as EventListener);
    return () =>
      window.removeEventListener(
        'browser-open-settings',
        handleOpenSettingsEvent as EventListener
      );
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.loadHistory) return;
    window.electronAPI
      .loadHistory()
      .then((items) => setHistoryItems(sortHistoryItems(items ?? [])))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const handleFocus = () => setAddressBarFocused(true);
    const handleBlur = () => setAddressBarFocused(false);

    window.addEventListener('browser-addressbar-focus', handleFocus);
    window.addEventListener('browser-addressbar-blur', handleBlur);

    return () => {
      window.removeEventListener('browser-addressbar-focus', handleFocus);
      window.removeEventListener('browser-addressbar-blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem(WALLPAPER_NOTICE_SEEN_KEY) === 'true') return;
    const storedTarget = Number(localStorage.getItem(WALLPAPER_NOTICE_TARGET_KEY));
    if (!storedTarget || Number.isNaN(storedTarget)) {
      const target = 3 + Math.floor(Math.random() * 3);
      localStorage.setItem(WALLPAPER_NOTICE_TARGET_KEY, String(target));
    }
  }, []);

  useEffect(() => {
    const currentUrl = activeTab?.url ?? '';
    const previousUrl = lastActiveUrlRef.current;
    lastActiveUrlRef.current = currentUrl;

    if (currentUrl !== 'browser://welcome') {
      if (showWallpaperNotice) setShowWallpaperNotice(false);
      return;
    }

    if (previousUrl === currentUrl) return;
    if (localStorage.getItem(WALLPAPER_NOTICE_SEEN_KEY) === 'true') return;

    const currentCount =
      Number(localStorage.getItem(WALLPAPER_NOTICE_COUNT_KEY) ?? '0') + 1;
    localStorage.setItem(WALLPAPER_NOTICE_COUNT_KEY, String(currentCount));

    let target = Number(localStorage.getItem(WALLPAPER_NOTICE_TARGET_KEY));
    if (!target || Number.isNaN(target)) {
      target = 3 + Math.floor(Math.random() * 3);
      localStorage.setItem(WALLPAPER_NOTICE_TARGET_KEY, String(target));
    }

    if (currentCount >= target) {
      localStorage.setItem(WALLPAPER_NOTICE_SEEN_KEY, 'true');
      setShowWallpaperNotice(true);
    }
  }, [activeTab?.url, showWallpaperNotice]);

  useEffect(() => {
    const handleWebviewFocus = () => setAdBlockOpen(false);
    window.addEventListener('browser-webview-focus', handleWebviewFocus as EventListener);
    return () => {
      window.removeEventListener(
        'browser-webview-focus',
        handleWebviewFocus as EventListener
      );
    };
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

  const handleGoBack = useCallback(() => {
    if (!activeTab) return;
    if (isInternalUrl(activeTab.url)) {
      const previousUrl = lastExternalUrlById[activeTabId];
      if (previousUrl) {
        navigateTo(previousUrl);
      }
      return;
    }
    if (!activeTab.canGoBack) {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, url: 'browser://welcome', title: 'Start Page', loading: false }
            : tab
        )
      );
      return;
    }
    browserRef.current?.goBack();
  }, [activeTab, activeTabId, lastExternalUrlById, navigateTo]);

  const showWelcomeTab = useCallback(() => {
    setHistoryOpen(false);
    setSettingsOpen(false);
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, url: 'browser://welcome', title: 'Start Page', loading: false }
          : tab
      )
    );
  }, [activeTabId]);
  const handleGoForward = useCallback(() => browserRef.current?.goForward(), []);
  const handleReload = useCallback(() => browserRef.current?.reload(), []);
  const handleStop = useCallback(() => browserRef.current?.stop(), []);
  const handleHistoryEntry = useCallback((entry: { url: string; title: string }) => {
    const payload: HistoryItem = { ...entry, timestamp: Date.now() };
    if (!window.electronAPI?.addHistory) {
      setHistoryItems((prev) => sortHistoryItems([payload, ...prev]));
      return;
    }
    window.electronAPI
      .addHistory(payload)
      .then((items) => {
        if (items) setHistoryItems(sortHistoryItems(items));
      })
      .catch(() => undefined);
  }, []);

  const handleClearHistory = useCallback(() => {
    if (!window.electronAPI?.clearHistory) {
      setHistoryItems([]);
      return;
    }
    window.electronAPI
      .clearHistory()
      .then((items) => setHistoryItems(sortHistoryItems(items ?? [])))
      .catch(() => undefined);
  }, []);
  const handleToggleAdBlock = useCallback(
    () => setAdBlockEnabled(!adBlockEnabled),
    [adBlockEnabled, setAdBlockEnabled]
  );

  const handleShieldLayout = useCallback((rect: DOMRect) => {
    setShieldRect(rect);
  }, []);

  const updateShieldRect = useCallback(() => {
    const node = shieldRef.current;
    if (!node) return;
    setShieldRect(node.getBoundingClientRect());
  }, []);

  const handleShieldRef = useCallback((node: HTMLDivElement | null) => {
    shieldRef.current = node;
  }, []);

  const handleShieldToggle = useCallback(() => {
    setAdBlockOpen((prev) => !prev);
  }, []);

  useLayoutEffect(() => {
    if (!adBlockOpen) return;
    updateShieldRect();
  }, [adBlockOpen, addressBarFocused, onboardingOpen, sidebarOpen, tabs.length, updateShieldRect]);

  useEffect(() => {
    if (!adBlockOpen) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (adBlockRef.current?.contains(target)) return;
      if (shieldRef.current?.contains(target)) return;
      setAdBlockOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [adBlockOpen]);

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

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingClosing(true);
    if (onboardingTimerRef.current !== null) {
      window.clearTimeout(onboardingTimerRef.current);
    }
    onboardingTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
      setOnboardingOpen(false);
      setOnboardingClosing(false);
      showWelcomeTab();
    }, 260);
  }, [showWelcomeTab]);

  useEffect(() => {
    return () => {
      if (onboardingTimerRef.current !== null) {
        window.clearTimeout(onboardingTimerRef.current);
      }
      if (onboardingIntroTimerRef.current !== null) {
        window.clearTimeout(onboardingIntroTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!onboardingOpen) {
      setOnboardingVisible(false);
      if (onboardingIntroTimerRef.current !== null) {
        window.clearTimeout(onboardingIntroTimerRef.current);
      }
      return;
    }
    if (localStorage.getItem(ONBOARDING_SEEN_KEY) !== 'true') {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    }
    setOnboardingVisible(false);
    if (onboardingIntroTimerRef.current !== null) {
      window.clearTimeout(onboardingIntroTimerRef.current);
    }
    onboardingIntroTimerRef.current = window.setTimeout(() => {
      setOnboardingVisible(true);
    }, 1000);
  }, [onboardingOpen]);

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
        </div>
      )}
      <div className="flex flex-col flex-shrink-0 z-50 bg-transparent electron-drag">
        {onboardingOpen ? (
          <div className="h-9 flex items-center justify-end w-full electron-no-drag">
            <div className="pr-2">
              <WindowControls />
            </div>
          </div>
        ) : (
          <BrowserToolbar
            sidebarOpen={sidebarOpen}
            onSidebarToggle={handleSidebarToggle}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            onReload={handleReload}
            onStop={handleStop}
            loading={activeTab.loading}
            onNewTab={handleNewTab}
            onShieldLayout={handleShieldLayout}
            onShieldClick={handleShieldToggle}
            shieldActive={adBlockOpen}
            onShieldRef={handleShieldRef}
          />
        )}
        {!onboardingOpen && (
          <div className="absolute top-1 left-0 right-0 z-[60] h-9 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto w-[440px]">
              <AddressBar
                url={activeTab.url}
                onNavigate={handleNavigate}
                loading={activeTab.loading}
                searchEngine={searchEngine}
                customSearchUrl={customSearchUrl}
              />
            </div>
          </div>
        )}
        <div
          className={`electron-no-drag mt-2 bg-transparent overflow-hidden transition-[opacity,transform,max-height] duration-200 ease-out ${
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
                onHistoryEntry={handleHistoryEntry}
                historyItems={historyItems}
                onClearHistory={handleClearHistory}
                hideNewTabPage={onboardingOpen && !onboardingClosing}
                onOpenNewTab={handleOpenNewTab}
              />
            </div>
          )}
          {historyOpen && (
            <div className="absolute inset-0 z-10">
              <HistoryPage items={historyItems} onClear={handleClearHistory} />
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
                adBlockEnabled={adBlockEnabled}
                onAdBlockEnabledChange={setAdBlockEnabled}
                searchEngine={searchEngine}
                onSearchEngineChange={setSearchEngine}
                initialSection={settingsSection}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSavingSettings}
                onSave={handleSaveSettings}
                onClose={handleCloseSettings}
              />
            </div>
          )}
          {onboardingOpen && (
            <div
              className={`absolute inset-0 z-20 will-change-[opacity,transform] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                onboardingClosing
                  ? 'opacity-0 translate-y-2 scale-[0.985]'
                  : onboardingVisible
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-3 scale-[0.985] pointer-events-none'
              }`}
            >
              <OnboardingFlow
                wallpaper={wallpaper}
                onWallpaperChange={setWallpaper}
                wallpaperColor={wallpaperColor}
                onWallpaperColorChange={setWallpaperColor}
                backgroundType={backgroundType}
                onBackgroundTypeChange={setBackgroundType}
                searchEngine={searchEngine}
                onSearchEngineChange={setSearchEngine}
                adBlockEnabled={adBlockEnabled}
                onAdBlockEnabledChange={setAdBlockEnabled}
                isActive={onboardingVisible && !onboardingClosing}
                onComplete={handleOnboardingComplete}
              />
            </div>
          )}
        </main>

      </div>

      {!onboardingOpen && (
        <div
          className={`electron-no-drag absolute top-10 left-0 right-0 z-[65] flex justify-center pointer-events-none transition-[opacity,transform] duration-200 ease-in-out ${
            addressBarFocused ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
          }`}
        >
          <div className="w-[440px] pointer-events-auto">
              <SuggestionsBar
              tabs={tabs}
              searchEngine={searchEngine}
              isOpen={addressBarFocused}
              historyItems={historyItems}
              historySorted={historySorted}
              topSites={topSites}
            />
          </div>
        </div>
      )}

      {shieldRect && adBlockOpen && (
        <div
          className="electron-no-drag absolute z-[70] pointer-events-none"
          style={{
            top: Math.round(shieldRect.bottom + 8),
            left: Math.round(shieldRect.left + shieldRect.width / 2 - 112)
          }}
        >
          <div className="pointer-events-auto" ref={adBlockRef}>
            <AdBlockWidget
              adBlockEnabled={adBlockEnabled}
              blockedCount={adBlockBlockedCount}
              onToggleAdBlock={handleToggleAdBlock}
            />
          </div>
        </div>
      )}

      <div className="electron-no-drag absolute bottom-6 right-6 z-50">
        <WallpaperNotice
          onOpenSettings={handleOpenSettings}
          isEnabled={showWallpaperNotice}
        />
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
