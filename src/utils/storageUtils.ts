/**
 * Local storage utilities for persisting app data
 */

export const storageUtils = {
  /**
   * Safely get an item from localStorage
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      if (typeof window === 'undefined') return defaultValue || null;
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : (defaultValue || null);
    } catch {
      console.warn(`Failed to retrieve ${key} from storage`);
      return defaultValue || null;
    }
  },

  /**
   * Safely set an item in localStorage
   */
  setItem<T>(key: string, value: T): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`Failed to save ${key} to storage`);
    }
  },

  /**
   * Remove an item from localStorage
   */
  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      console.warn(`Failed to remove ${key} from storage`);
    }
  },

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.clear();
    } catch {
      console.warn('Failed to clear storage');
    }
  },

  /**
   * Get string value from localStorage
   */
  getString(key: string, defaultValue: string = ''): string {
    try {
      if (typeof window === 'undefined') return defaultValue;
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set string value in localStorage
   */
  setString(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {
      console.warn(`Failed to save string ${key} to storage`);
    }
  },

  /**
   * Get boolean value from localStorage
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Set boolean value in localStorage
   */
  setBoolean(key: string, value: boolean): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`Failed to save boolean ${key} to storage`);
    }
  }
};
