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
  ({ tabs, activeTabId, onTabUpdate }, ref) => {
    const webviewsRef = useRef<Record<string, WebviewTag | null>>({});
    const cleanupRef = useRef<Record<string, (() => void) | undefined>>({});
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

    const attachWebview = useCallback(
      (tabId: string) => (el: WebviewTag | null) => {
        if (cleanupRef.current[tabId]) {
          cleanupRef.current[tabId]?.();
          cleanupRef.current[tabId] = undefined;
        }

        webviewsRef.current[tabId] = el;

        if (!el) return;

        const handleStart = () => onTabUpdate(tabId, { loading: true });
        const handleStop = () => {
          onTabUpdate(tabId, { loading: false });
          updateNavState(tabId, el);
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
        };
        const handleFail = () => onTabUpdate(tabId, { loading: false });

        el.addEventListener('did-start-loading', handleStart);
        el.addEventListener('did-stop-loading', handleStop);
        el.addEventListener('page-title-updated', handleTitle);
        el.addEventListener('page-favicon-updated', handleFavicon);
        el.addEventListener('did-navigate', handleNavigate);
        el.addEventListener('did-navigate-in-page', handleNavigate);
        el.addEventListener('did-fail-load', handleFail);

        cleanupRef.current[tabId] = () => {
          el.removeEventListener('did-start-loading', handleStart);
          el.removeEventListener('did-stop-loading', handleStop);
          el.removeEventListener('page-title-updated', handleTitle);
          el.removeEventListener('page-favicon-updated', handleFavicon);
          el.removeEventListener('did-navigate', handleNavigate);
          el.removeEventListener('did-navigate-in-page', handleNavigate);
          el.removeEventListener('did-fail-load', handleFail);
        };
      },
      [onTabUpdate, updateNavState]
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
              return <NewTabPage key={tab.id} />;
            }
            if (tab.url === 'browser://history') {
              return <HistoryPage key={tab.id} />;
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
