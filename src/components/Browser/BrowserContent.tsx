import React, {
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef
} from 'react';
import { Tab } from '@/lib/types';
import { HistoryPage } from './HistoryPage';
import { NewTabPage } from './NewTabPage';
import { useWebviewManager } from '@/hooks/useWebviewManager';

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
    const { attachWebview } = useWebviewManager({
      tabs,
      activeTabId,
      onTabUpdate,
      onHistoryEntry,
      onOpenNewTab
    });
    const isElectron = useMemo(() => isElectronRuntime(), []);

    const activeWebview = useCallback(() => {
      return webviewsRef.current[activeTabId] || null;
    }, [activeTabId]);

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
                allowpopups={true}
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
