import React from 'react';
import { solidColorOptions } from '@/lib/appearance';
import { SettingsGroup } from './SettingsGroup';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

interface AppearanceSettingsSectionProps {
  wallpaper: string;
  onWallpaperChange: (wallpaper: string) => void;
  wallpaperColor: string;
  onWallpaperColorChange: (color: string) => void;
  backgroundType: 'wallpaper' | 'solid';
  onBackgroundTypeChange: (type: 'wallpaper' | 'solid') => void;
  wallpaperBlur: boolean;
  onWallpaperBlurChange: (blur: boolean) => void;
  newTabShowGreeting: boolean;
  onNewTabShowGreetingChange: (value: boolean) => void;
  newTabShowShortcut: boolean;
  onNewTabShowShortcutChange: (value: boolean) => void;
  newTabShowSearch: boolean;
  onNewTabShowSearchChange: (value: boolean) => void;
  newTabShowClock: boolean;
  onNewTabShowClockChange: (value: boolean) => void;
  newTabShowFavorites: boolean;
  onNewTabShowFavoritesChange: (value: boolean) => void;
  newTabFavorites: Array<{ title: string; url: string }>;
  onNewTabFavoritesChange: (value: Array<{ title: string; url: string }>) => void;
}

export const AppearanceSettingsSection: React.FC<
  AppearanceSettingsSectionProps
> = ({
  wallpaper,
  onWallpaperChange,
  wallpaperColor,
  onWallpaperColorChange,
  backgroundType,
  onBackgroundTypeChange,
  wallpaperBlur,
  onWallpaperBlurChange,
  newTabShowGreeting,
  onNewTabShowGreetingChange,
  newTabShowShortcut,
  onNewTabShowShortcutChange,
  newTabShowSearch,
  onNewTabShowSearchChange,
  newTabShowClock,
  onNewTabShowClockChange,
  newTabShowFavorites,
  onNewTabShowFavoritesChange,
  newTabFavorites,
  onNewTabFavoritesChange
}) => {
  const hasWallpaper = Boolean(wallpaper);
  const activeWallpaper =
    backgroundType === 'wallpaper' ? wallpaper : '';
  const activeColor =
    backgroundType === 'solid' ? wallpaperColor : '';
  const [favoriteTitle, setFavoriteTitle] = React.useState('');
  const [favoriteUrl, setFavoriteUrl] = React.useState('');

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  const handleAddFavorite = () => {
    const url = normalizeUrl(favoriteUrl);
    const title = favoriteTitle.trim() || url;
    if (!url) return;
    onNewTabFavoritesChange([
      ...newTabFavorites,
      { title, url }
    ]);
    setFavoriteTitle('');
    setFavoriteUrl('');
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <SettingsGroup title="Background">
        {/* IMPORTANT:
            - No horizontal padding here
            - Parent scroll container already provides px
        */}
        <div className="py-8 overflow-x-hidden">
          <div className="mx-auto max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="w-[120px]" />

              <div className="flex items-center rounded-xl bg-[color:var(--ui-hover-strong)] p-1">
                {(['wallpaper', 'solid'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onBackgroundTypeChange(type)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                      backgroundType === type
                        ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm'
                        : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                    }`}
                  >
                    {type === 'wallpaper' ? 'Wallpaper' : 'Solid'}
                  </button>
                ))}
              </div>

              <div className="w-[120px] flex justify-end">
                {backgroundType === 'wallpaper' && hasWallpaper && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[color:var(--ui-text-muted)]">
                        Blur
                      </span>
                      <ToggleSwitch
                        checked={wallpaperBlur}
                        onChange={onWallpaperBlurChange}
                        ariaLabel="Toggle blur effect"
                      />
                    </div>
                    <span className="text-[11px] leading-snug text-right text-[color:var(--ui-text-subtle)]">
                      Improves readability
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="mx-auto w-full max-w-4xl overflow-x-hidden">
              <div className="relative isolate aspect-video overflow-hidden rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)]">
                {activeWallpaper ? (
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                      wallpaperBlur ? 'scale-105 blur-sm' : ''
                    }`}
                    style={{
                      backgroundImage: `url(${activeWallpaper})`
                    }}
                  />
                ) : activeColor ? (
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: activeColor }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                    <div>
                      <p className="text-sm text-[color:var(--ui-text-muted)]">
                        No {backgroundType} selected
                      </p>
                      <p className="text-xs text-[color:var(--ui-text-subtle)]">
                        Choose one below to customize your background
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {backgroundType === 'wallpaper' && (
                <div className="mx-auto flex max-w-md items-center justify-center gap-3">
                  <label className="cursor-pointer rounded-lg bg-[color:var(--ui-accent)] px-4 py-2.5 text-sm font-medium text-[color:var(--ui-accent-contrast)] transition hover:opacity-90">
                    {hasWallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            onWallpaperChange(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {hasWallpaper && (
                    <button
                      onClick={() => onWallpaperChange('')}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium transition hover:bg-[color:var(--ui-hover)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              {backgroundType === 'solid' && (
                <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
                  {solidColorOptions.map((color) => {
                    const isDefault = color === 'default';
                    const isSelected = isDefault
                      ? !wallpaperColor
                      : wallpaperColor === color;

                    return (
                      <button
                        key={color}
                        onClick={() =>
                          onWallpaperColorChange(
                            isDefault ? '' : color
                          )
                        }
                        className={`relative h-6 w-6 rounded-full border transition ${
                          isSelected
                            ? 'border-[color:var(--ui-ring)] ring-2 ring-[color:var(--ui-ring)]'
                            : 'border-[color:var(--ui-border)] hover:border-[color:var(--ui-ring)]'
                        }`}
                        style={{
                          backgroundColor: isDefault
                            ? '#181716'
                            : color
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="New Tab"
        description="Pick what shows up on your start page. Changes appear immediately."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[color:var(--ui-text)]">
                Greeting text
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Show the "Ready when you are" message.
              </div>
            </div>
            <ToggleSwitch
              checked={newTabShowGreeting}
              onChange={onNewTabShowGreetingChange}
              ariaLabel="Toggle greeting text"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[color:var(--ui-text)]">
                Shortcut hint
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Show the Ctrl + L hint.
              </div>
            </div>
            <ToggleSwitch
              checked={newTabShowShortcut}
              onChange={onNewTabShowShortcutChange}
              ariaLabel="Toggle shortcut hint"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[color:var(--ui-text)]">
                Search bar
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Show a large search bar on the page.
              </div>
            </div>
            <ToggleSwitch
              checked={newTabShowSearch}
              onChange={onNewTabShowSearchChange}
              ariaLabel="Toggle search bar"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[color:var(--ui-text)]">
                Clock
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Show the local time and date.
              </div>
            </div>
            <ToggleSwitch
              checked={newTabShowClock}
              onChange={onNewTabShowClockChange}
              ariaLabel="Toggle clock"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[color:var(--ui-text)]">
                Favorites
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Show your favorite shortcuts.
              </div>
            </div>
            <ToggleSwitch
              checked={newTabShowFavorites}
              onChange={onNewTabShowFavoritesChange}
              ariaLabel="Toggle favorites"
            />
          </div>

          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-4 py-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
              Favorites list
            </div>
            <div className="flex flex-col gap-2">
              {newTabFavorites.length === 0 && (
                <div className="text-xs text-[color:var(--ui-text-muted)]">
                  Add a few favorites to show them on the new tab page.
                </div>
              )}
              {newTabFavorites.map((favorite, index) => (
                <div
                  key={`${favorite.url}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--ui-surface)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[color:var(--ui-text)] truncate">
                      {favorite.title}
                    </div>
                    <div className="text-xs text-[color:var(--ui-text-muted)] truncate">
                      {favorite.url}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNewTabFavoritesChange(
                        newTabFavorites.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    className="text-xs px-2 py-1 rounded-md text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)] transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr,1fr,auto]">
              <input
                type="text"
                value={favoriteTitle}
                onChange={(event) => setFavoriteTitle(event.target.value)}
                placeholder="Label (optional)"
                className="w-full rounded-lg border border-[color:var(--ui-border)] bg-transparent px-3 py-2 text-sm text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-subtle)]"
              />
              <input
                type="text"
                value={favoriteUrl}
                onChange={(event) => setFavoriteUrl(event.target.value)}
                placeholder="Website URL"
                className="w-full rounded-lg border border-[color:var(--ui-border)] bg-transparent px-3 py-2 text-sm text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-subtle)]"
              />
              <button
                type="button"
                onClick={handleAddFavorite}
                className="rounded-lg bg-[color:var(--ui-accent)] px-3 py-2 text-sm font-medium text-[color:var(--ui-accent-contrast)] hover:brightness-95"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
};
