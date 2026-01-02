import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef
} from 'react';
import { Tab } from '@/lib/types';
import { HistoryPage } from './HistoryPage';
import { NewTabPage } from './NewTabPage';

interface BrowserContentProps {
  tabs: Tab[];
  activeTabId: string;
  onTabUpdate: (id: string, patch: Partial<Tab>) => void;
  onHistoryEntry?: (entry: { url: string; title: string }) => void;
  historyItems?: Array<{ url: string; title: string; timestamp: number }>;
  onClearHistory?: () => void;
  hideNewTabPage?: boolean;
  onOpenNewTab?: (url: string) => void;
}

export interface BrowserContentHandle {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  loadUrl: (url: string) => void;
}

const isElectronRuntime = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.electronAPI);
};

export const BrowserContent = forwardRef<BrowserContentHandle, BrowserContentProps>(
  (
    {
      tabs,
      activeTabId,
      onTabUpdate,
      onHistoryEntry,
      historyItems,
      onClearHistory,
      hideNewTabPage,
      onOpenNewTab
    },
    ref
  ) => {
    const webviewsRef = useRef<Record<string, WebviewTag | null>>({});
    const cleanupRef = useRef<Record<string, (() => void) | undefined>>({});
    const cosmeticsUrlRef = useRef<Record<string, string>>({});
    const cosmeticsCssKeyRef = useRef<Record<string, string[]>>({});
    const lastHistoryKeyRef = useRef<Record<string, string>>({});
    const isElectron = useMemo(() => isElectronRuntime(), []);

    const activeWebview = useCallback(() => {
      return webviewsRef.current[activeTabId] || null;
    }, [activeTabId]);

    const updateNavState = useCallback(
      (tabId: string, webview: WebviewTag | null) => {
        if (!webview) return;
        onTabUpdate(tabId, {
          canGoBack: webview.canGoBack(),
          canGoForward: webview.canGoForward()
        });
      },
      [onTabUpdate]
    );

    const applyCosmetics = useCallback(
      async (tabId: string, webview: WebviewTag | null, url?: string) => {
        if (!webview || !url) return;
        if (!window.electronAPI?.getAdblockCosmetics) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) return;
        if (cosmeticsUrlRef.current[tabId] === url) return;

        const existingKeys = cosmeticsCssKeyRef.current[tabId] ?? [];
        if (existingKeys.length) {
          for (const key of existingKeys) {
            try {
              await webview.removeInsertedCSS(key);
            } catch {
              // Ignore removal failures.
            }
          }
        }
        cosmeticsCssKeyRef.current[tabId] = [];
        cosmeticsUrlRef.current[tabId] = url;
        try {
          const { styles, scripts } = await window.electronAPI.getAdblockCosmetics(url);
          if (styles?.length) {
            const key = await webview.insertCSS(styles.join('\n'));
            if (key) cosmeticsCssKeyRef.current[tabId] = [key];
          }
          if (scripts?.length) {
            await webview.executeJavaScript(scripts.join('\n'), true);
          }
        } catch {
          // Ignore cosmetic injection failures.
        }
      },
      []
    );

    const attachWebview = useCallback(
      (tabId: string) => (el: WebviewTag | null) => {
        if (cleanupRef.current[tabId]) {
          cleanupRef.current[tabId]?.();
          cleanupRef.current[tabId] = undefined;
        }

        webviewsRef.current[tabId] = el;
        if (!el) {
          cosmeticsCssKeyRef.current[tabId] = [];
          cosmeticsUrlRef.current[tabId] = '';
          return;
        }

        const handleStart = () => onTabUpdate(tabId, { loading: true });
        const handleStop = () => {
          onTabUpdate(tabId, { loading: false });
          updateNavState(tabId, el);
          const url = el.getURL?.();
          if (!url || url.startsWith('browser://')) return;
          if (!url.startsWith('http://') && !url.startsWith('https://')) return;
          const title = typeof el.getTitle === 'function' ? el.getTitle() : url;
          const key = `${url}|${title}`;
          if (lastHistoryKeyRef.current[tabId] === key) return;
          lastHistoryKeyRef.current[tabId] = key;
          onHistoryEntry?.({ url, title: title || url });
        };
        const handleTitle = (event: any) =>
          onTabUpdate(tabId, { title: event?.title || 'New Tab' });
        const handleFavicon = (event: any) => {
          const favicon = event?.favicons?.[0];
          if (favicon) onTabUpdate(tabId, { favicon });
        };
        const handleNavigate = (event: any) => {
          if (event?.url) onTabUpdate(tabId, { url: event.url });
          updateNavState(tabId, el);
          if (event?.url) applyCosmetics(tabId, el, event.url);
        };
        const handleFail = () => {
          onTabUpdate(tabId, { loading: false });
          updateNavState(tabId, el);
        };
        const handleDomReady = () => {
          applyCosmetics(tabId, el, el.getURL());
        };
        const handleBeforeInput = (event: any) => {
          const input = event?.input || event?.detail?.input || event;
          if (!input) return;
          const key = String(input.key || input.code || '').toLowerCase();
          if (key !== 'l' && key !== 'keyl') return;
          const hasModifier = Boolean(
            input.control || input.meta || input.ctrlKey || input.metaKey
          );
          if (!hasModifier) return;
          if (typeof event.preventDefault === 'function') event.preventDefault();
          window.dispatchEvent(new CustomEvent('browser-focus-address-bar'));
        };
        const handleWebviewFocus = () => {
          window.dispatchEvent(new CustomEvent('browser-webview-focus'));
        };
        const handleNewWindow = (event: any) => {
          const url = event?.url;
          if (typeof event?.preventDefault === 'function') {
            event.preventDefault();
          }
          if (url) onOpenNewTab?.(url);
        };

        el.addEventListener('did-start-loading', handleStart);
        el.addEventListener('did-stop-loading', handleStop);
        el.addEventListener('page-title-updated', handleTitle);
        el.addEventListener('page-favicon-updated', handleFavicon);
        el.addEventListener('did-navigate', handleNavigate);
        el.addEventListener('did-navigate-in-page', handleNavigate);
        el.addEventListener('did-fail-load', handleFail);
        el.addEventListener('before-input-event', handleBeforeInput);
        el.addEventListener('dom-ready', handleDomReady);
        el.addEventListener('focus', handleWebviewFocus);
        el.addEventListener('new-window', handleNewWindow);

        cleanupRef.current[tabId] = () => {
          el.removeEventListener('did-start-loading', handleStart);
          el.removeEventListener('did-stop-loading', handleStop);
          el.removeEventListener('page-title-updated', handleTitle);
          el.removeEventListener('page-favicon-updated', handleFavicon);
          el.removeEventListener('did-navigate', handleNavigate);
          el.removeEventListener('did-navigate-in-page', handleNavigate);
          el.removeEventListener('did-fail-load', handleFail);
          el.removeEventListener('before-input-event', handleBeforeInput);
          el.removeEventListener('dom-ready', handleDomReady);
          el.removeEventListener('focus', handleWebviewFocus);
          el.removeEventListener('new-window', handleNewWindow);
        };
      },
      [applyCosmetics, onHistoryEntry, onOpenNewTab, onTabUpdate, updateNavState]
    );

    useImperativeHandle(
      ref,
      () => ({
        goBack: () => activeWebview()?.goBack(),
        goForward: () => activeWebview()?.goForward(),
        reload: () => activeWebview()?.reload(),
        stop: () => activeWebview()?.stop(),
        loadUrl: (url: string) => {
          const view = activeWebview();
          if (!view) return;
          view.loadURL(url);
        }
      }),
      [activeWebview]
    );

    useEffect(() => {
      return () => {
        Object.values(cleanupRef.current).forEach((cleanup) => {
          if (typeof cleanup === 'function') cleanup();
        });
      };
    }, []);

    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

    return (
      <div className="w-full h-full bg-transparent relative">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isInternal = tab.url.startsWith('browser://');
          const shouldShow = isActive;

          if (isInternal) {
            if (!shouldShow) return null;
            if (tab.url === 'browser://welcome') {
              if (hideNewTabPage) return null;
              return <NewTabPage key={tab.id} />;
            }
            if (tab.url === 'browser://history') {
              return (
                <HistoryPage
                  key={tab.id}
                  items={historyItems ?? []}
                  onClear={onClearHistory}
                />
              );
            }
            return (
              <div key={tab.id} className="p-10 text-[color:var(--ui-text)]">
                <div className="inline-flex rounded-2xl bg-[color:var(--ui-surface)] backdrop-blur-xl px-6 py-4">
                  Internal Page: {tab.url}
                </div>
              </div>
            );
          }

          if (!isElectron && shouldShow) {
            return (
              <div key={tab.id} className="w-full h-full flex items-center justify-center p-6">
                <div className="max-w-md text-center text-[color:var(--ui-text)] rounded-2xl bg-[color:var(--ui-surface)] backdrop-blur-xl px-6 py-4">
                  This UI needs Electron to render full web pages. Run `npm run electron:dev`.
                </div>
              </div>
            );
          }

          if (!isElectron) return null;

          return (
            <div
              key={tab.id}
              className={`absolute inset-0 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <webview
                ref={attachWebview(tab.id)}
                src={tab.url}
                className="w-full h-full"
                allowpopups="true"
              />
            </div>
          );
        })}
        {!activeTab && (
          <div className="p-10 text-[color:var(--ui-text)]">
            <div className="inline-flex rounded-2xl bg-[color:var(--ui-surface)] backdrop-blur-xl px-6 py-4">
              No active tab.
            </div>
          </div>
        )}
      </div>
    );
  }
);

BrowserContent.displayName = 'BrowserContent';
