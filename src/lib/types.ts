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

export interface NewTabFavorite {
  title: string;
  url: string;
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

export type BackgroundType = 'wallpaper' | 'solid';

export interface AppSettings {
  theme: Theme;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  backgroundType: BackgroundType;
  wallpaper: string;
  wallpaperColor: string;
  wallpaperBlur: boolean;
  adBlockEnabled: boolean;
  newTabShowGreeting: boolean;
  newTabShowShortcut: boolean;
  newTabShowSearch: boolean;
  newTabShowClock: boolean;
  newTabShowFavorites: boolean;
  newTabFavorites: NewTabFavorite[];
}
