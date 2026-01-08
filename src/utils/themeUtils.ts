/**
 * Theme management utilities
 */

import { AppSettings, Theme } from '@/lib/types';

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const clamp = (value: number): number => {
  return Math.min(255, Math.max(0, Math.round(value)));
};

const mix = (from: number, to: number, amount: number): number => {
  return from + (to - from) * amount;
};

const makeRgba = (color: RGBColor, alpha: number): string => {
  return `rgba(${clamp(color.r)}, ${clamp(color.g)}, ${clamp(color.b)}, ${alpha})`;
};

export const applyTheme = (
  isDark: boolean,
  avg?: RGBColor
): Record<string, string> => {
  const root = window.document.documentElement;
  const cssVars: Record<string, string> = {};

  root.classList.toggle('dark', isDark);

  const overlay = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.25)';
  cssVars['--ui-wallpaper-overlay'] = overlay;

  const base = avg ?? (isDark ? { r: 15, g: 23, b: 42 } : { r: 248, g: 250, b: 252 });

  const tintTarget = isDark ? 0 : 255;
  const surfaceTint: RGBColor = {
    r: clamp(mix(base.r, tintTarget, isDark ? 0.2 : 0.14)),
    g: clamp(mix(base.g, tintTarget, isDark ? 0.2 : 0.14)),
    b: clamp(mix(base.b, tintTarget, isDark ? 0.2 : 0.14))
  };

  const hoverTint: RGBColor = {
    r: clamp(mix(surfaceTint.r, isDark ? 255 : 0, 0.08)),
    g: clamp(mix(surfaceTint.g, isDark ? 255 : 0, 0.08)),
    b: clamp(mix(surfaceTint.b, isDark ? 255 : 0, 0.08))
  };

  const borderMix = isDark ? 0.22 : 0.18;
  const borderTint: RGBColor = {
    r: clamp(mix(surfaceTint.r, isDark ? 255 : 0, borderMix)),
    g: clamp(mix(surfaceTint.g, isDark ? 255 : 0, borderMix)),
    b: clamp(mix(surfaceTint.b, isDark ? 255 : 0, borderMix))
  };

  const borderAlpha = isDark ? 0.32 : 0.24;
  const ringAlpha = isDark ? 0.46 : 0.34;

  cssVars['--ui-base'] = makeRgba(base, 1);
  cssVars['--ui-surface'] = makeRgba(surfaceTint, isDark ? 0.72 : 0.68);
  cssVars['--ui-surface-strong'] = makeRgba(surfaceTint, isDark ? 0.82 : 0.78);
  cssVars['--ui-surface-muted'] = makeRgba(surfaceTint, isDark ? 0.58 : 0.52);
  cssVars['--ui-surface-subtle'] = makeRgba(surfaceTint, isDark ? 0.48 : 0.42);
  cssVars['--ui-hover'] = makeRgba(hoverTint, isDark ? 0.72 : 0.68);
  cssVars['--ui-hover-strong'] = makeRgba(hoverTint, isDark ? 0.82 : 0.78);
  cssVars['--ui-border'] = makeRgba(borderTint, borderAlpha);
  cssVars['--ui-ring'] = makeRgba(borderTint, ringAlpha);

  const textColor = isDark ? { r: 229, g: 231, b: 235 } : { r: 17, g: 24, b: 39 };
  const textMuted = isDark ? { r: 156, g: 163, b: 175 } : { r: 107, g: 114, b: 128 };
  const textSubtle = isDark ? { r: 107, g: 114, b: 128 } : { r: 156, g: 163, b: 175 };

  cssVars['--ui-text'] = makeRgba(textColor, 1);
  cssVars['--ui-text-muted'] = makeRgba(textMuted, 1);
  cssVars['--ui-text-subtle'] = makeRgba(textSubtle, 1);

  const newtabText = isDark ? { r: 209, g: 213, b: 219 } : { r: 31, g: 41, b: 55 };
  cssVars['--ui-newtab-text'] = makeRgba(newtabText, 1);
  cssVars['--ui-newtab-text-muted'] = makeRgba(
    isDark ? { r: 107, g: 114, b: 128 } : { r: 107, g: 114, b: 128 },
    1
  );
  cssVars['--ui-newtab-text-shadow'] = isDark
    ? 'rgba(0, 0, 0, 0.5)'
    : 'rgba(255, 255, 255, 0.3)';
  cssVars['--ui-newtab-clock-pill'] = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.2)';
  cssVars['--ui-newtab-clock-shadow'] = isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)';
  cssVars['--ui-overlay-text-shadow'] = 'rgba(0, 0, 0, 0.3)';

  cssVars['--ui-accent'] = isDark ? '#ffffff' : '#3b82f6';
  cssVars['--ui-accent-contrast'] = isDark ? '#000' : '#fff';

  // Apply all CSS variables to root
  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  return cssVars;
};

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const getThemeMode = (theme: Theme): 'light' | 'dark' => {
  if (theme === Theme.SYSTEM) {
    return getSystemTheme();
  }
  return theme as 'light' | 'dark';
};
