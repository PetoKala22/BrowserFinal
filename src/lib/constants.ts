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

export const MOCK_HISTORY = [
  { url: 'https://apple.com', title: 'Apple', timestamp: Date.now() },
  { url: 'https://github.com', title: 'GitHub', timestamp: Date.now() - 100000 },
];
