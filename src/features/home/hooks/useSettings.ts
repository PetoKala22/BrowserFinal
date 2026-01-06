import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSettings, BackgroundType, Theme } from '@/lib/types';

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
  currentSettings: AppSettings;
  savedSettings: AppSettings;
  setSavedSettings: (settings: AppSettings) => void;
  hasUnsavedChanges: boolean;
  isSavingSettings: boolean;
  applySettings: (settings: AppSettings) => void;
  handleSaveSettings: () => Promise<void>;
}

export const useSettings = (defaultSettings: AppSettings): UseSettingsResult => {
  const [theme, setTheme] = useState<Theme>(defaultSettings.theme);
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
      snowColor
    }),
    [
      searchEngine,
      customSearchUrl,
      backgroundType,
      wallpaper,
      wallpaperColor,
      wallpaperBlur,
      adBlockEnabled,
      snowColor
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
      savedSettings.snowColor !== currentSettings.snowColor
    );
  }, [currentSettings, savedSettings]);

  useEffect(() => {
    const root = window.document.documentElement;
    const dynamicVars = [
      '--ui-wallpaper-overlay',
      '--ui-base',
      '--ui-surface',
      '--ui-surface-strong',
      '--ui-surface-muted',
      '--ui-surface-subtle',
      '--ui-hover',
      '--ui-hover-strong',
      '--ui-border',
      '--ui-ring',
      '--ui-text',
      '--ui-text-muted',
      '--ui-text-subtle',
      '--ui-newtab-text',
      '--ui-newtab-text-muted',
      '--ui-newtab-text-shadow',
      '--ui-newtab-clock-pill',
      '--ui-newtab-clock-shadow',
      '--ui-overlay-text-shadow',
      '--ui-accent',
      '--ui-accent-contrast'
    ];

    const clearDynamicVars = () => {
      dynamicVars.forEach((token) => root.style.removeProperty(token));
    };

    const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
    const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

    const applyTheme = (isDark: boolean, avg?: { r: number; g: number; b: number }) => {
      root.classList.toggle('dark', isDark);
      const overlay = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.25)';
      root.style.setProperty('--ui-wallpaper-overlay', overlay);

      const base = avg ?? (isDark ? { r: 15, g: 23, b: 42 } : { r: 248, g: 250, b: 252 });
      const tintTarget = isDark ? 0 : 255;
      const surfaceTint = {
        r: clamp(mix(base.r, tintTarget, isDark ? 0.2 : 0.14)),
        g: clamp(mix(base.g, tintTarget, isDark ? 0.2 : 0.14)),
        b: clamp(mix(base.b, tintTarget, isDark ? 0.2 : 0.14))
      };
      const makeRgba = (color: { r: number; g: number; b: number }, alpha: number) =>
        `rgba(${clamp(color.r)}, ${clamp(color.g)}, ${clamp(color.b)}, ${alpha})`;

      const hoverTint = {
        r: clamp(mix(surfaceTint.r, isDark ? 255 : 0, 0.08)),
        g: clamp(mix(surfaceTint.g, isDark ? 255 : 0, 0.08)),
        b: clamp(mix(surfaceTint.b, isDark ? 255 : 0, 0.08))
      };
      const borderMix = isDark ? 0.22 : 0.18;
      const borderTint = {
        r: clamp(mix(surfaceTint.r, isDark ? 255 : 0, borderMix)),
        g: clamp(mix(surfaceTint.g, isDark ? 255 : 0, borderMix)),
        b: clamp(mix(surfaceTint.b, isDark ? 255 : 0, borderMix))
      };
      const borderAlpha = isDark ? 0.32 : 0.24;
      const ringAlpha = isDark ? 0.46 : 0.34;

      root.style.setProperty('--ui-base', makeRgba(base, 1));
      root.style.setProperty('--ui-surface', makeRgba(surfaceTint, isDark ? 0.72 : 0.68));
      root.style.setProperty('--ui-surface-strong', makeRgba(surfaceTint, isDark ? 0.82 : 0.78));
      root.style.setProperty('--ui-surface-muted', makeRgba(surfaceTint, isDark ? 0.58 : 0.52));
      root.style.setProperty('--ui-surface-subtle', makeRgba(surfaceTint, isDark ? 0.35 : 0.3));
      root.style.setProperty('--ui-hover', makeRgba(hoverTint, isDark ? 0.78 : 0.72));
      root.style.setProperty('--ui-hover-strong', makeRgba(hoverTint, isDark ? 0.88 : 0.82));
      root.style.setProperty('--ui-border', makeRgba(borderTint, borderAlpha));
      root.style.setProperty('--ui-ring', makeRgba(borderTint, ringAlpha));
      root.style.setProperty('--ui-text', isDark ? '#f8fafc' : '#0f172a');
      root.style.setProperty('--ui-text-muted', isDark ? '#cbd5e1' : '#475569');
      root.style.setProperty('--ui-text-subtle', isDark ? '#94a3b8' : '#64748b');
      root.style.setProperty('--ui-newtab-text', isDark ? '#f8fafc' : '#0f172a');
      root.style.setProperty(
        '--ui-newtab-text-muted',
        isDark ? 'rgba(226, 232, 240, 0.85)' : 'rgba(15, 23, 42, 0.78)'
      );
      root.style.setProperty(
        '--ui-newtab-text-shadow',
        isDark ? '0 1px 12px rgba(0, 0, 0, 0.55)' : '0 1px 10px rgba(255, 255, 255, 0.35)'
      );
      root.style.setProperty(
        '--ui-newtab-clock-pill',
        isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)'
      );
      root.style.setProperty(
        '--ui-newtab-clock-shadow',
        isDark ? '0 10px 28px rgba(0, 0, 0, 0.6)' : '0 8px 24px rgba(255, 255, 255, 0.35)'
      );
      root.style.setProperty(
        '--ui-overlay-text-shadow',
        isDark ? '0 1px 10px rgba(0, 0, 0, 0.55)' : '0 1px 8px rgba(255, 255, 255, 0.35)'
      );

      if (avg) {
        const pillTarget = isDark ? 255 : 0;
        const pillTint = {
          r: clamp(mix(avg.r, pillTarget, 0.6)),
          g: clamp(mix(avg.g, pillTarget, 0.6)),
          b: clamp(mix(avg.b, pillTarget, 0.6))
        };
        root.style.setProperty(
          '--ui-newtab-clock-pill',
          makeRgba(pillTint, isDark ? 0.22 : 0.18)
        );

        const liftTarget = isDark ? 255 : 0;
        const accent = {
          r: clamp(mix(avg.r, liftTarget, 0.18)),
          g: clamp(mix(avg.g, liftTarget, 0.18)),
          b: clamp(mix(avg.b, liftTarget, 0.18))
        };
        const accentLuma = (0.2126 * accent.r + 0.7152 * accent.g + 0.0722 * accent.b) / 255;
        const accentContrast = accentLuma > 0.6 ? '#0f172a' : '#f8fafc';
        root.style.setProperty('--ui-accent', `rgb(${accent.r}, ${accent.g}, ${accent.b})`);
        root.style.setProperty('--ui-accent-contrast', accentContrast);
      }
    };

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
      clearDynamicVars();
      root.classList.toggle('dark', true);
      root.style.setProperty('--ui-wallpaper-overlay', 'rgba(0, 0, 0, 0.35)');
      root.style.setProperty('--ui-base', '#181716');
      root.style.setProperty('--ui-surface', 'rgba(30, 29, 27, 0.82)');
      root.style.setProperty('--ui-surface-strong', 'rgba(36, 35, 33, 0.88)');
      root.style.setProperty('--ui-surface-muted', 'rgba(36, 35, 33, 0.72)');
      root.style.setProperty('--ui-surface-subtle', 'rgba(42, 41, 38, 0.55)');
      root.style.setProperty('--ui-hover', 'rgba(212, 188, 150, 0.14)');
      root.style.setProperty('--ui-hover-strong', 'rgba(212, 188, 150, 0.22)');
      root.style.setProperty('--ui-border', '#34322E');
      root.style.setProperty('--ui-ring', '#B8996E');
      root.style.setProperty('--ui-text', '#E6E3DE');
      root.style.setProperty('--ui-text-muted', '#B7B3AC');
      root.style.setProperty('--ui-text-subtle', '#8C8882');
      root.style.setProperty('--ui-newtab-text', '#F5F2ED');
      root.style.setProperty('--ui-newtab-text-muted', 'rgba(230, 227, 222, 0.78)');
      root.style.setProperty('--ui-newtab-text-shadow', '0 1px 12px rgba(0, 0, 0, 0.55)');
      root.style.setProperty('--ui-newtab-clock-pill', 'rgba(255, 255, 255, 0.16)');
      root.style.setProperty('--ui-newtab-clock-shadow', '0 10px 28px rgba(0, 0, 0, 0.6)');
      root.style.setProperty('--ui-overlay-text-shadow', '0 1px 10px rgba(0, 0, 0, 0.55)');
      root.style.setProperty('--ui-accent', '#C2A67E');
      root.style.setProperty('--ui-accent-contrast', '#1E1D1B');
      return;
    }

    if (!activeWallpaper && activeColor) {
      const avg = parseHexColor(activeColor.trim());
      if (!avg) {
        const shouldUseDark = theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark);
        clearDynamicVars();
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
        clearDynamicVars();
        root.classList.toggle('dark', theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark));
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
        clearDynamicVars();
        root.classList.toggle('dark', theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark));
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
      clearDynamicVars();
      root.classList.toggle('dark', theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark));
    };
    img.src = activeWallpaper;

    return () => {
      cancelled = true;
    };
  }, [theme, backgroundType, wallpaper, wallpaperColor]);

  useEffect(() => {
    if (!window.electronAPI?.setAdBlockEnabled) return;
    window.electronAPI.setAdBlockEnabled(adBlockEnabled).catch(() => undefined);
  }, [adBlockEnabled]);

  const applySettings = useCallback((settings: AppSettings) => {
    setTheme(Theme.SYSTEM);
    setSearchEngine(settings.searchEngine);
    setCustomSearchUrl(settings.customSearchUrl);
    setBackgroundType(settings.backgroundType);
    setWallpaper(settings.wallpaper);
    setWallpaperColor(settings.wallpaperColor);
    setWallpaperBlur(settings.wallpaperBlur);
    setAdBlockEnabled(settings.adBlockEnabled);
    setSnowColor(settings.snowColor ?? '#FFFFFF');
  }, []);

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
  }, [applySettings, defaultSettings]);

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
    currentSettings,
    savedSettings,
    setSavedSettings,
    hasUnsavedChanges,
    isSavingSettings,
    applySettings,
    handleSaveSettings
  };
};
