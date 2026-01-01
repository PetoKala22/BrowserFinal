import React, { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';

interface NewTabSettings {
  showGreeting: boolean;
  showShortcut: boolean;
  showSearch: boolean;
  showClock: boolean;
  showFavorites: boolean;
  favorites: Array<{ title: string; url: string }>;
}

interface NewTabPageProps {
  settings?: NewTabSettings;
  hideCustomize?: boolean;
}

const defaultSettings: NewTabSettings = {
  showGreeting: true,
  showShortcut: true,
  showSearch: false,
  showClock: false,
  showFavorites: false,
  favorites: []
};

export const NewTabPage: React.FC<NewTabPageProps> = ({ settings, hideCustomize }) => {
  const [now, setNow] = useState(() => new Date());
  const active = useMemo(() => ({ ...defaultSettings, ...(settings ?? {}) }), [settings]);

  useEffect(() => {
    if (!active.showClock) return undefined;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [active.showClock]);

  const handleFocusSearch = () => {
    window.dispatchEvent(new CustomEvent('browser-focus-address-bar'));
  };

  const handleCustomize = () => {
    window.dispatchEvent(
      new CustomEvent('browser-open-settings', { detail: { section: 'appearance' } })
    );
  };

  const formatUrl = (value: string) => value.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="w-full h-full flex items-center justify-center text-[color:var(--ui-newtab-text)] relative">
      {/* Background with visual detail (required for blur) */}
      <div className="absolute inset-0 bg-transparent" />

      {!hideCustomize && (
        <div className="absolute bottom-6 left-6 z-10">
          <button
            type="button"
            onClick={handleCustomize}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ui-surface)] px-3 py-1.5 text-xs font-medium text-[color:var(--ui-text)] backdrop-blur-md shadow-sm hover:bg-[color:var(--ui-surface-strong)] transition-colors"
          >
            <Settings size={14} />
            Customize
          </button>
        </div>
      )}

      <div
        className="relative text-center w-full max-w-3xl px-6"
        style={{ textShadow: 'var(--ui-newtab-text-shadow)' }}
      >
        {active.showClock && (
          <div className="mb-5">
            <div className="text-4xl font-semibold tracking-tight">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-1 text-xs text-[color:var(--ui-newtab-text-muted)]">
              {now.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}

        {active.showGreeting && (
          <>
            <div className="text-lg font-medium">Ready when you are</div>

            <div className="mt-2 text-md text-[color:var(--ui-newtab-text-muted)]">
              Start typing to search or enter a website
            </div>
          </>
        )}

        {active.showSearch && (
          <button
            type="button"
            onClick={handleFocusSearch}
            className="mt-6 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)]/70 px-5 py-3 text-left text-sm text-[color:var(--ui-newtab-text-muted)] backdrop-blur-md transition hover:bg-[color:var(--ui-surface-strong)]"
          >
            Search or enter a website
          </button>
        )}

        {active.showShortcut && (
          <div className="mt-4 text-xs text-[color:var(--ui-newtab-text-muted)]">
            Press{' '}
            <span
              className="
                inline-flex items-center
                px-2 py-0.5
                rounded-md
                bg-[color:var(--ui-surface)]
                backdrop-blur-md
                text-[color:var(--ui-newtab-text)]
                shadow-sm
              "
            >
              Ctrl + L
            </span>
          </div>
        )}

        {active.showFavorites && active.favorites.length > 0 && (
          <div className="mt-8">
            <div className="text-xs uppercase tracking-wide text-[color:var(--ui-newtab-text-muted)]">
              Favorites
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {active.favorites.map((favorite) => {
                const label = favorite.title || formatUrl(favorite.url);
                const domain = (() => {
                  try {
                    return new URL(favorite.url).hostname;
                  } catch {
                    return '';
                  }
                })();
                const iconUrl = domain
                  ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                  : '';

                return (
                  <button
                    key={`${favorite.url}-${favorite.title}`}
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('browser-suggestion-commit', {
                          detail: { value: favorite.url }
                        })
                      )
                    }
                    className="flex items-center gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)]/70 px-4 py-3 text-left backdrop-blur-md transition hover:bg-[color:var(--ui-surface-strong)]"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-[color:var(--ui-surface-strong)] flex items-center justify-center">
                      {iconUrl ? (
                        <img src={iconUrl} alt="" className="h-5 w-5" loading="lazy" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {label.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{label}</div>
                      <div className="text-xs text-[color:var(--ui-newtab-text-muted)] truncate">
                        {formatUrl(favorite.url)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
