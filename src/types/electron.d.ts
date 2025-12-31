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
    onNewWindow: (handler: (url: string) => void) => () => void;
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
