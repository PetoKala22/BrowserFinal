import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSettings, Layout, Theme } from '@/lib/types';

interface UseSettingsResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  searchEngine: AppSettings['searchEngine'];
  setSearchEngine: (engine: AppSettings['searchEngine']) => void;
  customSearchUrl: string;
  setCustomSearchUrl: (url: string) => void;
  layout: Layout;
  setLayout: (layout: Layout) => void;
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
  const [savedSettings, setSavedSettings] = useState<AppSettings>(defaultSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const currentSettings = useMemo(
    () => ({ theme, searchEngine, customSearchUrl, layout }),
    [theme, searchEngine, customSearchUrl, layout]
  );

  const hasUnsavedChanges = useMemo(() => {
    return (
      savedSettings.theme !== currentSettings.theme ||
      savedSettings.searchEngine !== currentSettings.searchEngine ||
      savedSettings.customSearchUrl !== currentSettings.customSearchUrl ||
      savedSettings.layout !== currentSettings.layout
    );
  }, [currentSettings, savedSettings]);

  useEffect(() => {
    const root = window.document.documentElement;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = theme === Theme.DARK || (theme === Theme.SYSTEM && prefersDark);
    if (shouldUseDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const applySettings = useCallback(
    (settings: AppSettings) => {
      setTheme(settings.theme);
      setSearchEngine(settings.searchEngine);
      setCustomSearchUrl(settings.customSearchUrl);
      setLayout(settings.layout);
    },
    []
  );

  useEffect(() => {
    if (!window.electronAPI?.loadSettings) return;
    window.electronAPI
      .loadSettings()
      .then((loaded) => {
        if (!loaded) return;
        const merged = { ...defaultSettings, ...loaded };
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
    theme,
    setTheme,
    searchEngine,
    setSearchEngine,
    customSearchUrl,
    setCustomSearchUrl,
    layout,
    setLayout,
    currentSettings,
    savedSettings,
    setSavedSettings,
    hasUnsavedChanges,
    isSavingSettings,
    applySettings,
    handleSaveSettings
  };
};
