export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  loading: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export interface HistoryItem {
  url: string;
  title: string;
  timestamp: number;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum SearchEngine {
  GOOGLE = 'google',
  YAHOO = 'yahoo',
  DUCKDUCKGO = 'duckduckgo',
  BING = 'bing',
  CUSTOM = 'custom'
}

export enum Layout {
  GENERIC = 'generic',
  SIDEBAR = 'sidebar'
}

export interface AppSettings {
  theme: Theme;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  layout: Layout;
  wallpaper: string;
  wallpaperBlur: boolean;
}
