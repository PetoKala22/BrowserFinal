/**
 * Refactored useSettings hook - manages all application settings
 * Splits theme logic, background logic, and search settings
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSettings, BackgroundType, Theme, PermissionType } from '@/lib/types';
import { applyTheme, getThemeMode } from '@/utils/themeUtils';

interface UseSettingsResult {
  searchEngine: AppSettings['searchEngine'];
  setSearchEngine: (engine: AppSettings['searchEngine']) => void;
  customSearchUrl: string;
  setCustomSearchUrl: (url: string) => void;
  backgroundType: BackgroundType;
  setBackgroundType: (type: BackgroundType) => void;
  wallpaper: string;
  setWallpaper: (wallpaper: string) => void;
  wallpaperColor: string;
  setWallpaperColor: (color: string) => void;
  wallpaperBlur: boolean;
  setWallpaperBlur: (blur: boolean) => void;
  adBlockEnabled: boolean;
  setAdBlockEnabled: (enabled: boolean) => void;
  snowColor: string;
  setSnowColor: (color: string) => void;
  permissions: Record<string, { type: PermissionType; allowed: boolean; ask: boolean }[]>;
  setPermissions: React.Dispatch<React.SetStateAction<Record<string, { type: PermissionType; allowed: boolean; ask: boolean }[]>>>;
  currentSettings: AppSettings;
  savedSettings: AppSettings;
  setSavedSettings: (settings: AppSettings) => void;
  hasUnsavedChanges: boolean;
  isSavingSettings: boolean;
  applySettings: (settings: AppSettings) => void;
  handleSaveSettings: () => Promise<void>;
}

export const useSettings = (defaultSettings: AppSettings): UseSettingsResult => {
  const [theme, setThemeState] = useState<Theme>(defaultSettings.theme);
  const [searchEngine, setSearchEngine] = useState<AppSettings['searchEngine']>(
    defaultSettings.searchEngine
  );
  const [customSearchUrl, setCustomSearchUrl] = useState(defaultSettings.customSearchUrl);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>(
    defaultSettings.backgroundType
  );
  const [wallpaper, setWallpaper] = useState(defaultSettings.wallpaper);
  const [wallpaperColor, setWallpaperColor] = useState(defaultSettings.wallpaperColor);
  const [wallpaperBlur, setWallpaperBlur] = useState(defaultSettings.wallpaperBlur);
  const [adBlockEnabled, setAdBlockEnabled] = useState(defaultSettings.adBlockEnabled);
  const [snowColor, setSnowColor] = useState(defaultSettings.snowColor ?? '#FFFFFF');
  const [permissions, setPermissions] = useState(defaultSettings.permissions ?? {});
  const [savedSettings, setSavedSettings] = useState<AppSettings>(defaultSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const currentSettings = useMemo(
    () => ({
      theme: Theme.SYSTEM,
      searchEngine,
      customSearchUrl,
      backgroundType,
      wallpaper,
      wallpaperColor,
      wallpaperBlur,
      adBlockEnabled,
      snowColor,
      permissions
    }),
    [
      searchEngine,
      customSearchUrl,
      backgroundType,
      wallpaper,
      wallpaperColor,
      wallpaperBlur,
      adBlockEnabled,
      snowColor,
      permissions
    ]
  );

  const hasUnsavedChanges = useMemo(() => {
    return (
      savedSettings.theme !== currentSettings.theme ||
      savedSettings.searchEngine !== currentSettings.searchEngine ||
      savedSettings.customSearchUrl !== currentSettings.customSearchUrl ||
      savedSettings.backgroundType !== currentSettings.backgroundType ||
      savedSettings.wallpaper !== currentSettings.wallpaper ||
      savedSettings.wallpaperColor !== currentSettings.wallpaperColor ||
      savedSettings.wallpaperBlur !== currentSettings.wallpaperBlur ||
      savedSettings.adBlockEnabled !== currentSettings.adBlockEnabled ||
      savedSettings.snowColor !== currentSettings.snowColor ||
      JSON.stringify(savedSettings.permissions) !== JSON.stringify(currentSettings.permissions)
    );
  }, [currentSettings, savedSettings]);

  // Handle background and theme application
  useEffect(() => {
    applyBackgroundTheme(theme, backgroundType, wallpaper, wallpaperColor);
  }, [theme, backgroundType, wallpaper, wallpaperColor]);

  // Handle ad block enablement
  useEffect(() => {
    if (!window.electronAPI?.setAdBlockEnabled) return;
    window.electronAPI.setAdBlockEnabled(adBlockEnabled).catch(() => undefined);
  }, [adBlockEnabled]);

  // Load settings from storage
  useEffect(() => {
    if (!window.electronAPI?.loadSettings) return;
    window.electronAPI
      .loadSettings()
      .then((loaded) => {
        if (!loaded) return;
        const merged = { ...defaultSettings, ...loaded, theme: Theme.SYSTEM };
        applySettings(merged);
        setSavedSettings(merged);
      })
      .catch(() => undefined);
  }, [defaultSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const applySettings = useCallback((settings: AppSettings) => {
    setThemeState(Theme.SYSTEM);
    setSearchEngine(settings.searchEngine);
    setCustomSearchUrl(settings.customSearchUrl);
    setBackgroundType(settings.backgroundType);
    setWallpaper(settings.wallpaper);
    setWallpaperColor(settings.wallpaperColor);
    setWallpaperBlur(settings.wallpaperBlur);
    setAdBlockEnabled(settings.adBlockEnabled);
    setSnowColor(settings.snowColor ?? '#FFFFFF');
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(currentSettings);
      }
      setSavedSettings(currentSettings);
    } finally {
      setIsSavingSettings(false);
    }
  }, [currentSettings]);

  return {
    searchEngine,
    setSearchEngine,
    customSearchUrl,
    setCustomSearchUrl,
    backgroundType,
    setBackgroundType,
    wallpaper,
    setWallpaper,
    wallpaperColor,
    setWallpaperColor,
    wallpaperBlur,
    setWallpaperBlur,
    adBlockEnabled,
    setAdBlockEnabled,
    snowColor,
    setSnowColor,
    permissions,
    setPermissions,
    currentSettings,
    savedSettings,
    setSavedSettings,
    hasUnsavedChanges,
    isSavingSettings,
    applySettings,
    handleSaveSettings
  };
};

/**
 * Apply background and theme logic
 */
function applyBackgroundTheme(
  theme: Theme,
  backgroundType: BackgroundType,
  wallpaper: string,
  wallpaperColor: string
) {
  const root = window.document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

  const parseHexColor = (value: string) => {
    const hex = value.replace('#', '');
    if (![3, 6].includes(hex.length)) return null;
    const expand = hex.length === 3;
    const r = parseInt(expand ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(expand ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(expand ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  };

  const activeWallpaper = backgroundType === 'wallpaper' ? wallpaper : '';
  const activeColor = backgroundType === 'solid' ? wallpaperColor : '';

  if (!activeWallpaper && !activeColor) {
    root.classList.toggle('dark', true);
    return;
  }

  if (!activeWallpaper && activeColor) {
    const avg = parseHexColor(activeColor.trim());
    if (!avg) {
      const shouldUseDark =
        theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark);
      root.classList.toggle('dark', shouldUseDark);
      return;
    }
    const luma = (0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b) / 255;
    const shouldUseDark = luma < 0.55;
    applyTheme(shouldUseDark, avg);
    return;
  }

  let cancelled = false;
  const img = new Image();
  img.onload = () => {
    if (cancelled) return;
    const canvas = document.createElement('canvas');
    const size = 24;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      root.classList.toggle(
        'dark',
        theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark)
      );
      return;
    }
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 10) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    if (!count) {
      root.classList.toggle(
        'dark',
        theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark)
      );
      return;
    }
    const avg = {
      r: r / count,
      g: g / count,
      b: b / count
    };
    const luma = (0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b) / 255;
    const shouldUseDark = luma < 0.55;
    applyTheme(shouldUseDark, avg);
  };
  img.onerror = () => {
    if (cancelled) return;
    root.classList.toggle(
      'dark',
      theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark)
    );
  };
  img.src = activeWallpaper;
}
