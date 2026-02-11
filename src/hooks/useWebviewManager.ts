import { useCallback, useRef, useEffect } from 'react';
import { Tab } from '@/lib/types';

interface UseWebviewManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onTabUpdate: (id: string, patch: Partial<Tab>) => void;
  onHistoryEntry?: (entry: { url: string; title: string }) => void;
  onOpenNewTab?: (url: string) => void;
}

export const useWebviewManager = ({
  tabs,
  activeTabId,
  onTabUpdate,
  onHistoryEntry,
  onOpenNewTab
}: UseWebviewManagerProps) => {
  const webviewsRef = useRef<Record<string, WebviewTag | null>>({});
  const cleanupRef = useRef<Record<string, (() => void) | undefined>>({});
  const cosmeticsUrlRef = useRef<Record<string, string>>({});
  const cosmeticsCssKeyRef = useRef<Record<string, string[]>>({});
  const lastHistoryKeyRef = useRef<Record<string, string>>({});

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

  useEffect(() => {
    return () => {
      Object.values(cleanupRef.current).forEach((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, []);

  // Suspend inactive webviews to save memory
  useEffect(() => {
    tabs.forEach(tab => {
      const webview = webviewsRef.current[tab.id];
      if (!webview) return;
      if (tab.id === activeTabId) {
        // Resume active webview
        try {
          if (typeof webview.resume === 'function') webview.resume();
        } catch {}
      } else {
        // Pause inactive webview
        try {
          if (typeof webview.pause === 'function') webview.pause();
        } catch {}
      }
    });
  }, [tabs, activeTabId]);

  return { attachWebview };
};