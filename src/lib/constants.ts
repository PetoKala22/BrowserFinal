import { Tab } from '@/lib/types';

export const INITIAL_TABS: Tab[] = [
  {
    id: '1',
    title: 'Welcome Page',
    url: 'browser://welcome',
    loading: false,
    canGoBack: false,
    canGoForward: false,
  }
];

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  MODAL: 200,
  TOOLTIP: 150,
} as const;

// UI dimensions and breakpoints
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 280,
  TAB_HEIGHT: 40,
  ADDRESS_BAR_HEIGHT: 48,
  WINDOW_CONTROLS_HEIGHT: 32,
  MIN_TAB_WIDTH: 120,
  MAX_TAB_WIDTH: 240,
} as const;

// History and storage limits
export const STORAGE_LIMITS = {
  HISTORY_MAX_ITEMS: 300,
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
  THROTTLE_MS: 15 * 1000, // 15 seconds
} as const;

// WebGL and rendering constants
export const RENDER_CONSTANTS = {
  SKY_LAYER_COUNT: 3,
  CLOUD_PARTICLES_MAX: 1000,
  WEBGL_MAX_TEXTURE_SIZE: 4096,
  ANIMATION_FRAME_RATE: 60,
} as const;
