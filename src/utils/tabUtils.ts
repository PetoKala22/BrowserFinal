/**
 * Tab management utility functions
 */

import { Tab } from '@/lib/types';

export const createTab = (
  id: string,
  title: string,
  url: string,
  favicon?: string
): Tab => {
  return {
    id,
    title,
    url,
    favicon,
    loading: false,
    canGoBack: false,
    canGoForward: false
  };
};

export const updateTab = (
  tabs: Tab[],
  id: string,
  updates: Partial<Tab>
): Tab[] => {
  return tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab));
};

export const removeTab = (tabs: Tab[], id: string): Tab[] => {
  return tabs.filter((tab) => tab.id !== id);
};

export const getActiveTab = (tabs: Tab[], activeTabId: string): Tab | undefined => {
  return tabs.find((tab) => tab.id === activeTabId);
};

export const getDuplicateTab = (tab: Tab, newId: string): Tab => {
  return {
    ...tab,
    id: newId,
    loading: false
  };
};

export const reorderTabs = (
  tabs: Tab[],
  fromIndex: number,
  toIndex: number
): Tab[] => {
  const reordered = [...tabs];
  const [removed] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, removed);
  return reordered;
};
