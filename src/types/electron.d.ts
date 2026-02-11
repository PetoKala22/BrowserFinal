import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { AppSettings, HistoryItem, PermissionRequest } from '@/lib/types';

export {};

declare global {
  interface ElectronAPI {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    loadSettings: () => Promise<AppSettings | null>;
    saveSettings: (settings: AppSettings) => Promise<void>;
    setAdBlockEnabled: (enabled: boolean) => Promise<boolean>;
    getAdblockStats: () => Promise<{ blocked: number }>;
    getAdblockCosmetics: (url: string) => Promise<{ styles: string[]; scripts: string[] }>;
    loadHistory: () => Promise<HistoryItem[]>;
    addHistory: (entry: HistoryItem) => Promise<HistoryItem[]>;
    clearHistory: () => Promise<HistoryItem[]>;
    respondPermission: (id: string, granted: boolean) => Promise<void>;
    onAdblockStats: (handler: (stats: { blocked: number }) => void) => () => void;
    onNewWindow: (handler: (url: string) => void) => () => void;
    onPermissionRequest: (handler: (request: PermissionRequest) => void) => () => void;
    onFocusAddressBar: (handler: () => void) => () => void;
    onSpotlightOpen: (handler: () => void) => () => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }

  interface WebviewTag extends HTMLElement {
    loadURL: (url: string) => void;
    getURL: () => string;
    getTitle?: () => string;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stop: () => void;
    insertCSS: (css: string) => Promise<string>;
    removeInsertedCSS?: (key: string) => Promise<void>;
    executeJavaScript: (code: string, userGesture?: boolean) => Promise<any>;
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<WebviewTag>, WebviewTag> & {
        src?: string;
        partition?: string;
        allowpopups?: boolean | string;
      };
    }
  }
}
