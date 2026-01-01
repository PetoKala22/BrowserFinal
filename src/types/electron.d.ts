import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { AppSettings } from '@/lib/types';

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
    getAdblockCosmetics: (url: string) => Promise<{ styles: string[]; scripts: string[] }>;
    onNewWindow: (handler: (url: string) => void) => () => void;
    onFocusAddressBar: (handler: () => void) => () => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }

  interface WebviewTag extends HTMLElement {
    loadURL: (url: string) => void;
    getURL: () => string;
    canGoBack: () => boolean;
    canGoForward: () => boolean;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stop: () => void;
    insertCSS: (css: string) => Promise<string>;
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
