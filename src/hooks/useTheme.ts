/**
 * Hook for managing theme-related settings
 */

import { useCallback, useEffect, useState } from 'react';
import { Theme } from '@/lib/types';
import { getSystemTheme } from '@/utils/themeUtils';

const THEME_STORAGE_KEY = 'appTheme';

interface UseThemeResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

export const useTheme = (defaultTheme: Theme = Theme.SYSTEM): UseThemeResult => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || defaultTheme;
  });

  const effectiveTheme = theme === Theme.SYSTEM ? getSystemTheme() : (theme as 'light' | 'dark');

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== Theme.SYSTEM) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Trigger re-render by updating state
      setThemeState(theme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme,
    effectiveTheme
  };
};
