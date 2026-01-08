/**
 * URL utility functions for browser operations
 */

export const isInternalUrl = (url: string): boolean => {
  return url.startsWith('browser://');
};

export const normalizeUrl = (url: string): string => {
  return url.startsWith('http') ? url : `https://${url}`;
};

export const getTabTitleFromUrl = (url: string): string => {
  if (isInternalUrl(url)) {
    return 'Start Page';
  }

  try {
    const normalized = normalizeUrl(url);
    const hostname = new URL(normalized).hostname;
    return hostname?.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
};

export const getHostnameFromUrl = (url: string): string => {
  try {
    const normalized = normalizeUrl(url);
    return new URL(normalized).hostname || '';
  } catch {
    return '';
  }
};
