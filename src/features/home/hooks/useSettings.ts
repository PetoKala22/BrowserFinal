import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSettings, Layout, Theme } from '@/lib/types';

interface UseSettingsResult {
  searchEngine: AppSettings['searchEngine'];
  setSearchEngine: (engine: AppSettings['searchEngine']) => void;
  customSearchUrl: string;
  setCustomSearchUrl: (url: string) => void;
  layout: Layout;
  setLayout: (layout: Layout) => void;
  wallpaper: string;
  setWallpaper: (wallpaper: string) => void;
  wallpaperBlur: boolean;
  setWallpaperBlur: (blur: boolean) => void;
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
  const [layout, setLayout] = useState<Layout>(defaultSettings.layout);
  const [wallpaper, setWallpaper] = useState(defaultSettings.wallpaper);
  const [wallpaperBlur, setWallpaperBlur] = useState(defaultSettings.wallpaperBlur);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(defaultSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const currentSettings = useMemo(
    () => ({
      theme: Theme.SYSTEM,
      searchEngine,
      customSearchUrl,
      layout,
      wallpaper,
      wallpaperBlur
    }),
    [searchEngine, customSearchUrl, layout, wallpaper, wallpaperBlur]
  );

  const hasUnsavedChanges = useMemo(() => {
    return (
      savedSettings.theme !== currentSettings.theme ||
      savedSettings.searchEngine !== currentSettings.searchEngine ||
      savedSettings.customSearchUrl !== currentSettings.customSearchUrl ||
      savedSettings.layout !== currentSettings.layout ||
      savedSettings.wallpaper !== currentSettings.wallpaper ||
      savedSettings.wallpaperBlur !== currentSettings.wallpaperBlur
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
      const borderTint = {
        r: clamp(mix(surfaceTint.r, isDark ? 255 : 0, isDark ? 0.18 : 0.12)),
        g: clamp(mix(surfaceTint.g, isDark ? 255 : 0, isDark ? 0.18 : 0.12)),
        b: clamp(mix(surfaceTint.b, isDark ? 255 : 0, isDark ? 0.18 : 0.12))
      };

      root.style.setProperty('--ui-base', makeRgba(base, 1));
      root.style.setProperty('--ui-surface', makeRgba(surfaceTint, isDark ? 0.72 : 0.68));
      root.style.setProperty('--ui-surface-strong', makeRgba(surfaceTint, isDark ? 0.82 : 0.78));
      root.style.setProperty('--ui-surface-muted', makeRgba(surfaceTint, isDark ? 0.58 : 0.52));
      root.style.setProperty('--ui-surface-subtle', makeRgba(surfaceTint, isDark ? 0.35 : 0.3));
      root.style.setProperty('--ui-hover', makeRgba(hoverTint, isDark ? 0.78 : 0.72));
      root.style.setProperty('--ui-hover-strong', makeRgba(hoverTint, isDark ? 0.88 : 0.82));
      root.style.setProperty('--ui-border', makeRgba(borderTint, isDark ? 0.28 : 0.2));
      root.style.setProperty('--ui-ring', makeRgba(borderTint, isDark ? 0.4 : 0.3));
      root.style.setProperty('--ui-text', isDark ? '#f8fafc' : '#0f172a');
      root.style.setProperty('--ui-text-muted', isDark ? '#cbd5e1' : '#475569');
      root.style.setProperty('--ui-text-subtle', isDark ? '#94a3b8' : '#64748b');

      if (avg) {
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

    if (!wallpaper) {
      const shouldUseDark = theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark);
      clearDynamicVars();
      root.classList.toggle('dark', shouldUseDark);
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
    img.src = wallpaper;

    return () => {
      cancelled = true;
    };
  }, [theme, wallpaper]);

  const applySettings = useCallback((settings: AppSettings) => {
    setTheme(Theme.SYSTEM);
    setSearchEngine(settings.searchEngine);
    setCustomSearchUrl(settings.customSearchUrl);
    setLayout(settings.layout);
    setWallpaper(settings.wallpaper);
    setWallpaperBlur(settings.wallpaperBlur);
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
    layout,
    setLayout,
    wallpaper,
    setWallpaper,
    wallpaperBlur,
    setWallpaperBlur,
    currentSettings,
    savedSettings,
    setSavedSettings,
    hasUnsavedChanges,
    isSavingSettings,
    applySettings,
    handleSaveSettings
  };
};
