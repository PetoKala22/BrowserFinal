/**
 * History utility functions
 */

import { HistoryItem } from '@/lib/types';

export const sortHistoryItems = (items: HistoryItem[]): HistoryItem[] => {
  return [...items].sort((a, b) => b.timestamp - a.timestamp);
};

export const addHistoryItem = (
  history: HistoryItem[],
  item: HistoryItem,
  maxItems: number = 100
): HistoryItem[] => {
  // Check if URL already exists and update timestamp if it does
  const existingIndex = history.findIndex((h) => h.url === item.url);
  if (existingIndex !== -1) {
    const updated = [...history];
    updated[existingIndex] = { ...item };
    return sortHistoryItems(updated).slice(0, maxItems);
  }

  return sortHistoryItems([...history, item]).slice(0, maxItems);
};

export const removeHistoryItem = (
  history: HistoryItem[],
  url: string
): HistoryItem[] => {
  return history.filter((item) => item.url !== url);
};

export const searchHistory = (
  history: HistoryItem[],
  query: string
): HistoryItem[] => {
  const lowerQuery = query.toLowerCase();
  return history.filter(
    (item) =>
      item.url.toLowerCase().includes(lowerQuery) ||
      item.title.toLowerCase().includes(lowerQuery)
  );
};

export const clearHistory = (): HistoryItem[] => {
  return [];
};
