import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LuLink, LuRotateCcw, LuSearch, LuTrendingUp } from 'react-icons/lu';
import { SearchEngine, Tab } from '@/lib/types';

type SuggestionItem = {
  id: string;
  label: string;
  value: string;
  description?: string;
  hint?: string;
  icon?: React.ReactNode;
  type: 'search' | 'url' | 'tab' | 'top' | 'remote';
};

type TopSiteSuggestion = {
  id: string;
  label: string;
  value: string;
  hint: string;
  type: 'top';
};

const SEARCH_ENGINE_LABELS: Record<SearchEngine, string> = {
  [SearchEngine.GOOGLE]: 'Google',
  [SearchEngine.YAHOO]: 'Yahoo',
  [SearchEngine.DUCKDUCKGO]: 'DuckDuckGo',
  [SearchEngine.BING]: 'Bing',
  [SearchEngine.CUSTOM]: 'Search'
};

const MAX_SUGGESTIONS = 5;
const REMOTE_CACHE_TTL = 30_000;
const REMOTE_CACHE_LIMIT = 50;
const REMOTE_QUERY_MIN = 2;

const isLikelyUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('http') || trimmed.startsWith('browser://')) return true;
  return trimmed.includes('.') && !trimmed.includes(' ');
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http') || trimmed.startsWith('browser://')) return trimmed;
  return `https://${trimmed}`;
};

const getDuckDuckGoSuggestions = async (query: string, signal: AbortSignal) => {
  const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as Array<{ phrase?: string }>;
  return data.map((item) => item.phrase).filter((item): item is string => Boolean(item));
};

interface SuggestionsBarProps {
  tabs: Tab[];
  searchEngine: SearchEngine;
  isOpen: boolean;
  historyItems?: Array<{ url: string; title: string; timestamp: number }>;
  historySorted: Array<{ url: string; title: string; timestamp: number }>;
  topSites: TopSiteSuggestion[];
}

export const SuggestionsBar: React.FC<SuggestionsBarProps> = ({
  tabs,
  searchEngine,
  isOpen,
  historyItems = [],
  historySorted,
  topSites
}) => {
  const [query, setQuery] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const remoteCacheRef = useRef<Map<string, { items: string[]; ts: number }>>(new Map());
  const suggestionsRef = useRef<SuggestionItem[]>([]);
  const selectedIndexRef = useRef(-1);
  const isOpenRef = useRef(false);

  useEffect(() => {
    const handleInput = (event: Event) => {
      const custom = event as CustomEvent<{ value?: string }>;
      setQuery(custom.detail?.value ?? '');
    };

    window.addEventListener('browser-addressbar-input', handleInput as EventListener);
    return () => window.removeEventListener('browser-addressbar-input', handleInput as EventListener);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (
      !isOpen ||
      trimmed.length < REMOTE_QUERY_MIN ||
      searchEngine !== SearchEngine.DUCKDUCKGO ||
      isLikelyUrl(trimmed)
    ) {
      setRemoteSuggestions([]);
      return undefined;
    }

    const key = trimmed.toLowerCase();
    const cached = remoteCacheRef.current.get(key);
    if (cached && Date.now() - cached.ts < REMOTE_CACHE_TTL) {
      remoteCacheRef.current.delete(key);
      remoteCacheRef.current.set(key, cached);
      setRemoteSuggestions(cached.items);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getDuckDuckGoSuggestions(trimmed, controller.signal)
        .then((items) => {
          const unique = Array.from(new Set(items)).filter(
            (item) => item.toLowerCase() !== trimmed.toLowerCase()
          );
          const nextItems = unique.slice(0, 6);
          remoteCacheRef.current.set(key, { items: nextItems, ts: Date.now() });
          while (remoteCacheRef.current.size > REMOTE_CACHE_LIMIT) {
            const oldestKey = remoteCacheRef.current.keys().next().value;
            if (!oldestKey) break;
            remoteCacheRef.current.delete(oldestKey);
          }
          setRemoteSuggestions(nextItems);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteSuggestions([]);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isOpen, query, searchEngine]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const suggestions = useMemo(() => {
    const trimmed = query.trim();
    const lower = trimmed.toLowerCase();
    const items: SuggestionItem[] = [];

    if (trimmed) {
      const engineLabel = SEARCH_ENGINE_LABELS[searchEngine] ?? 'Search';
      items.push({
        id: `search-${trimmed}`,
        label: `Search ${engineLabel} for "${trimmed}"`,
        value: trimmed,
        hint: engineLabel,
        icon: <LuSearch size={14} />,
        type: 'search'
      });

      if (isLikelyUrl(trimmed)) {
        const normalized = normalizeUrl(trimmed);
        items.push({
          id: `url-${normalized}`,
          label: normalized.replace(/^https?:\/\//, ''),
          value: normalized,
          description: 'Open website',
          hint: 'Direct',
          icon: <LuLink size={14} />,
          type: 'url'
        });
      }
    }

    const tabMatches = tabs
      .filter((tab) => !tab.url.startsWith('browser://'))
      .filter((tab) => {
        if (!trimmed) return true;
        return (
          tab.title.toLowerCase().includes(lower) || tab.url.toLowerCase().includes(lower)
        );
      })
      .slice(0, trimmed ? 4 : 3)
      .map((tab) => ({
        id: `tab-${tab.id}`,
        label: tab.title || tab.url,
        value: tab.url,
        description: tab.url.replace(/^https?:\/\//, ''),
        hint: 'Open tab',
        icon: tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="h-4 w-4 rounded-sm object-contain"
            loading="lazy"
          />
        ) : undefined,
        type: 'tab' as const
      }));

    items.push(...tabMatches);

    if (!trimmed) {
      items.push(
        ...topSites.map((item) => ({
          ...item,
          icon: <LuTrendingUp size={14} />
        }))
      );
    }

    const historySource = trimmed
      ? historyItems
      : historySorted;

    const historyMatches = historySource
      .filter((item) => !item.url.startsWith('browser://'))
      .filter((item) => {
        if (!trimmed) return true;
        return (
          item.title.toLowerCase().includes(lower) || item.url.toLowerCase().includes(lower)
        );
      })
      .slice(0, trimmed ? 4 : 3)
      .map((item, index) => ({
        id: `history-${index}-${item.url}`,
        label: item.title || item.url,
        value: item.url,
        description: item.url.replace(/^https?:\/\//, ''),
        hint: 'History',
        icon: <LuRotateCcw size={14} />,
        type: 'url' as const
      }));

    items.push(...historyMatches);

    if (trimmed) {
      remoteSuggestions.forEach((suggestion, index) => {
        items.push({
          id: `remote-${index}-${suggestion}`,
          label: suggestion,
          value: suggestion,
          icon: <LuSearch size={14} />,
          hint: 'Suggestion',
          type: 'remote'
        });
      });
    }

    const deduped = new Map<string, SuggestionItem>();
    items.forEach((item) => {
      const key = item.value.toLowerCase();
      if (!deduped.has(key)) deduped.set(key, item);
    });
    return Array.from(deduped.values()).slice(0, MAX_SUGGESTIONS);
  }, [query, remoteSuggestions, searchEngine, tabs, historyItems, historySorted, topSites]);

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(-1);
      return;
    }
    const hasQuery = query.trim().length > 0;
    setSelectedIndex(hasQuery && suggestions.length ? 0 : -1);
  }, [isOpen, query, suggestions.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpenRef.current) return;
      const items = suggestionsRef.current;
      if (items.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
      }
      if (event.key === 'Enter' && selectedIndexRef.current >= 0) {
        event.preventDefault();
        const selected = items[selectedIndexRef.current];
        if (!selected) return;
        window.dispatchEvent(
          new CustomEvent('browser-suggestion-commit', {
            detail: { value: selected.value }
          })
        );
      }
      if (event.key === 'Escape') {
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
  <div className="pointer-events-auto w-full">
    <div className="w-full rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-strong)] shadow-lg overflow-hidden backdrop-blur-xl">
      <div className="flex flex-col py-0 px-0">
        {suggestions.map((item, index) => {
          const isActive = index === selectedIndex;
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('browser-suggestion-commit', {
                    detail: { value: item.value }
                  })
                )
              }
              className={`group relative flex w-full box-border items-center justify-between gap-0 p-3 text-left transition-[color,background,box-shadow] duration-150 ${
                isActive
                  ? 'bg-[color:var(--ui-hover)] text-[color:var(--ui-text)] shadow-sm ring-1 ring-[color:var(--ui-border)]'
                  : 'text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)] hover:shadow-sm'
              }`}
            >
              {/* Main content */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Optional icon placeholder - you can add icons here */}
                {item.icon && (
                  <div className={`shrink-0 transition-colors ${
                    isActive ? 'text-[color:var(--ui-text)]' : 'text-[color:var(--ui-text-muted)]'
                  }`}>
                    {item.icon}
                  </div>
                )}
                
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`truncate text-sm font-medium transition-colors ${
                    isActive ? 'text-[color:var(--ui-text)]' : 'text-[color:var(--ui-text)]'
                  }`}>
                    {item.label}
                  </span>
                  
                  {/* Optional description */}
                  {item.description && (
                    <span className="truncate text-xs text-[color:var(--ui-text-muted)] mt-0.5">
                      {item.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Hint/Keyboard shortcut */}
              {item.hint && (
                <div className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider transition-[color,background] ${
                  isActive 
                    ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text-muted)]' 
                    : 'bg-[color:var(--ui-surface-muted)]/40 text-[color:var(--ui-text-muted)] group-hover:bg-[color:var(--ui-surface-muted)]/60'
                }`}>
                  {item.hint}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);};
