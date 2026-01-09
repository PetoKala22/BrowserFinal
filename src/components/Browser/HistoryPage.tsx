import React, { useMemo } from 'react';
import { HistoryItem } from '@/lib/types';

interface HistoryPageProps {
  items?: HistoryItem[];
  onClear?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ items = [], onClear }) => {
  const hasItems = items.length > 0;
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.timestamp - a.timestamp),
    [items]
  );

  const openEntry = (url: string) => {
    window.dispatchEvent(
      new CustomEvent('browser-suggestion-commit', {
        detail: { value: url }
      })
    );
  };

  return (
    <div className="w-full h-full text-[color:var(--ui-text)] flex flex-col bg-transparent">
      <div className="flex-1 p-8">
        <div className="h-full rounded-2xl bg-[color:var(--ui-surface)] p-6 shadow-lg">
          {!hasItems && (
            <>
              <div className="text-sm font-medium">No history yet</div>
              <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                Visited pages will appear here as you browse.
              </div>
            </>
          )}
          {hasItems && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">History</div>
                {onClear && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-xs font-medium px-3 py-1 rounded-md bg-[color:var(--ui-surface-subtle)] text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)] transition-colors"
                  >
                    Clear history
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-2 overflow-y-auto pr-2">
                {sorted.map((item) => {
                  const time = new Date(item.timestamp);
                  const label = item.title || item.url;
                  return (
                    <button
                      key={`${item.url}-${item.timestamp}`}
                      type="button"
                      onClick={() => openEntry(item.url)}
                      className="w-full text-left rounded-xl px-4 py-3 bg-[color:var(--ui-surface-muted)]/40 hover:bg-[color:var(--ui-hover)] transition-colors"
                    >
                      <div className="text-sm font-medium truncate">{label}</div>
                      <div className="mt-1 text-xs text-[color:var(--ui-text-muted)] flex items-center gap-2">
                        <span className="truncate">{item.url}</span>
                        <span className="shrink-0 text-[color:var(--ui-text-subtle)]">
                          {time.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
