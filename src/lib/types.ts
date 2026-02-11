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

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
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

export enum PermissionType {
  GEOLOCATION = 'geolocation',
  MICROPHONE = 'microphone',
  CAMERA = 'camera',
  NOTIFICATIONS = 'notifications',
  CLIPBOARD_READ = 'clipboard-read',
  CLIPBOARD_WRITE = 'clipboard-write'
}

export interface PermissionRequest {
  id: string;
  type: PermissionType;
  origin: string;
  tabId: string;
}

export interface PermissionSetting {
  type: PermissionType;
  allowed: boolean;
  ask: boolean;
}

export interface AppSettings {
  theme: Theme;
  searchEngine: SearchEngine;
  customSearchUrl: string;
  backgroundType: BackgroundType;
  wallpaper: string;
  wallpaperColor: string;
  wallpaperBlur: boolean;
  adBlockEnabled: boolean;
  snowColor?: string;
  permissions?: Record<string, PermissionSetting[]>;
}
