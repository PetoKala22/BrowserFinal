import React, { useEffect, useMemo, useState } from 'react';
import { SearchEngine, Tab } from '@/lib/types';

type SuggestionItem = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  type: 'search' | 'url' | 'tab' | 'remote';
};

const SEARCH_ENGINE_LABELS: Record<SearchEngine, string> = {
  [SearchEngine.GOOGLE]: 'Google',
  [SearchEngine.YAHOO]: 'Yahoo',
  [SearchEngine.DUCKDUCKGO]: 'DuckDuckGo',
  [SearchEngine.BING]: 'Bing',
  [SearchEngine.CUSTOM]: 'Search'
};

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
}

export const SuggestionsBar: React.FC<SuggestionsBarProps> = ({ tabs, searchEngine, isOpen }) => {
  const [query, setQuery] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

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
    if (!isOpen || !trimmed) {
      setRemoteSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getDuckDuckGoSuggestions(trimmed, controller.signal)
        .then((items) => {
          const unique = Array.from(new Set(items)).filter(
            (item) => item.toLowerCase() !== trimmed.toLowerCase()
          );
          setRemoteSuggestions(unique.slice(0, 6));
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteSuggestions([]);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isOpen, query]);

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
        type: 'search'
      });

      if (isLikelyUrl(trimmed)) {
        const normalized = normalizeUrl(trimmed);
        items.push({
          id: `url-${normalized}`,
          label: normalized.replace(/^https?:\/\//, ''),
          value: normalized,
          hint: 'Direct',
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
      .slice(0, trimmed ? 4 : 6)
      .map((tab) => ({
        id: `tab-${tab.id}`,
        label: tab.title || tab.url,
        value: tab.url,
        hint: 'Open tab',
        type: 'tab' as const
      }));

    items.push(...tabMatches);

    if (trimmed) {
      remoteSuggestions.forEach((suggestion, index) => {
        items.push({
          id: `remote-${index}-${suggestion}`,
          label: suggestion,
          value: suggestion,
          hint: 'Suggestion',
          type: 'remote'
        });
      });
    }

    const deduped = new Map<string, SuggestionItem>();
    items.forEach((item) => {
      const key = `${item.type}-${item.value.toLowerCase()}`;
      if (!deduped.has(key)) deduped.set(key, item);
    });
    return Array.from(deduped.values());
  }, [query, remoteSuggestions, searchEngine, tabs]);

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
      if (!isOpen || suggestions.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? suggestions.length - 1 : prev - 1
        );
      }
      if (event.key === 'Enter' && selectedIndex >= 0) {
        event.preventDefault();
        const selected = suggestions[selectedIndex];
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
  }, [isOpen, selectedIndex, suggestions]);

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
  <div className="pointer-events-auto w-full">
    <div className="w-full rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-strong)] shadow-lg overflow-hidden backdrop-blur-xl">
      <div className="flex flex-col py-1.5">
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
              className={`group relative flex w-full items-center justify-between gap-3 px-4 py-2.5 mx-1.5 rounded-lg text-left transition-all duration-150 ${
                isActive
                  ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm'
                  : 'text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)] hover:shadow-md hover:ring-1 hover:ring-[color:var(--ui-border)]'
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
                <div className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all ${
                  isActive 
                    ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text-muted)]' 
                    : 'bg-[color:var(--ui-surface-muted)]/30 text-[color:var(--ui-text-muted)] group-hover:bg-[color:var(--ui-surface-muted)]/50'
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
