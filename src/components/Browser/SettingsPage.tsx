import React, { useState } from 'react';
import { X } from 'lucide-react';
import { solidColorOptions } from '@/lib/appearance';
import { SearchEngine } from '@/lib/types';
import { IconButton } from '@/components/ui/IconButton';

interface SettingsPageProps {
  wallpaper: string;
  onWallpaperChange: (wallpaper: string) => void;
  wallpaperColor: string;
  onWallpaperColorChange: (color: string) => void;
  backgroundType: 'wallpaper' | 'solid';
  onBackgroundTypeChange: (type: 'wallpaper' | 'solid') => void;
  wallpaperBlur: boolean;
  onWallpaperBlurChange: (blur: boolean) => void;
  searchEngine: SearchEngine;
  onSearchEngineChange: (engine: SearchEngine) => void;
  customSearchUrl: string;
  onCustomSearchUrlChange: (url: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}

type SettingsSection = 'general' | 'appearance' | 'search' | 'privacy' | 'advanced';

const settingsSections: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'search', label: 'Search engine' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'advanced', label: 'Advanced' }
];

const searchOptions = [
  { id: SearchEngine.GOOGLE, label: 'Google', description: 'Fast results with broad coverage.' },
  { id: SearchEngine.YAHOO, label: 'Yahoo', description: 'Classic search with news integrations.' },
  { id: SearchEngine.DUCKDUCKGO, label: 'DuckDuckGo', description: 'Privacy-focused search.' },
  { id: SearchEngine.BING, label: 'Bing', description: 'Microsoft search experience.' },
  { id: SearchEngine.CUSTOM, label: 'Custom', description: 'Use a custom search URL.' }
];

const SettingsGroup: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="space-y-3">
    <div>
      <div className="text-xs uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
        {title}
      </div>
      {description && (
        <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
          {description}
        </div>
      )}
    </div>
    {children}
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({
  wallpaper,
  onWallpaperChange,
  wallpaperColor,
  onWallpaperColorChange,
  backgroundType,
  onBackgroundTypeChange,
  wallpaperBlur,
  onWallpaperBlurChange,
  searchEngine,
  onSearchEngineChange,
  customSearchUrl,
  onCustomSearchUrlChange,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onClose
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const hasWallpaper = Boolean(wallpaper);
  const activeWallpaper = backgroundType === 'wallpaper' ? wallpaper : '';
  const activeColor = backgroundType === 'solid' ? wallpaperColor : '';
  const hasActiveWallpaper = Boolean(activeWallpaper);
  const hasActiveColor = Boolean(activeColor);

  return (
    <div className="h-full w-full">
      <div className="flex h-full p-8">
        <div className="flex h-full w-full gap-6 bg-[color:var(--ui-surface)] border border-[color:var(--ui-border)] rounded-2xl backdrop-blur-xl p-4">

          {/* Sidebar */}
          <aside className="w-[220px] shrink-0 rounded-2xl p-3">
            <div className="text-xs uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
              Settings
            </div>

            <nav className="mt-3 flex flex-col gap-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`relative rounded-lg px-3 py-2 text-sm text-left transition-colors
                    ${
                      activeSection === section.id
                        ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)]'
                        : 'text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)]'
                    }`}
                >
                  {activeSection === section.id && (
                    <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-[color:var(--ui-accent)]" />
                  )}
                  <span className="pl-2">{section.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <section className="relative flex-1 rounded-2xl bg-[color:var(--ui-surface-strong)] shadow-md p-6 overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--ui-text)]">
                  Settings
                </div>
                <div className="text-xs text-[color:var(--ui-text-muted)] capitalize">
                  {activeSection}
                </div>
              </div>
              <IconButton onClick={onClose}>
                <X size={16} />
              </IconButton>
            </div>

            {activeSection === 'appearance' && (
            <div className="space-y-10">
              <SettingsGroup title="Background">
                <div className="p-6">
                  <div className="grid grid-cols-3 items-center pb-4">
                    <div />
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1 rounded-xl bg-[color:var(--ui-hover-strong)] p-1">
                        <button
                          onClick={() => onBackgroundTypeChange('wallpaper')}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            backgroundType === 'wallpaper'
                              ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm'
                              : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                          }`}
                        >
                          Wallpaper
                        </button>
                        <button
                          onClick={() => onBackgroundTypeChange('solid')}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            backgroundType === 'solid'
                              ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm'
                              : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                          }`}
                        >
                          Solid
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      {backgroundType === 'wallpaper' && hasWallpaper && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[color:var(--ui-text-muted)]">
                            Blur
                          </span>
                          <button
                            onClick={() => onWallpaperBlurChange(!wallpaperBlur)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              wallpaperBlur
                                ? 'bg-[color:var(--ui-accent)]'
                                : 'bg-[color:var(--ui-border)]'
                            }`}
                            aria-label="Toggle blur effect"
                          >
                            <div
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                wallpaperBlur ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative flex justify-center">
  <div className="w-full max-w-[1120px]">
    <div className="relative aspect-video overflow-hidden rounded-xl bg-[color:var(--ui-surface-subtle)] border border-[color:var(--ui-border)]">

      {hasActiveWallpaper ? (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
            wallpaperBlur ? 'blur-sm scale-105' : 'scale-100'
          }`}
          style={{ backgroundImage: `url(${activeWallpaper})` }}
        />
      ) : hasActiveColor ? (
        <div
          className="absolute inset-0 transition-colors duration-300"
          style={{ backgroundColor: activeColor }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <div className="text-sm text-[color:var(--ui-text-muted)] mb-1">
              {backgroundType === 'wallpaper'
                ? 'No wallpaper selected'
                : 'No color selected'}
            </div>
            <div className="text-xs text-[color:var(--ui-text-subtle)]">
              {backgroundType === 'wallpaper'
                ? 'Upload an image to customize your background'
                : 'Pick a solid color for your background'}
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
</div>

                  <div className="mt-5 space-y-4">
                    {backgroundType === 'wallpaper' && (
                      <>
                        <div className="flex items-center gap-2 w-full max-w-[520px] mx-auto">
                          <label className="flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] hover:opacity-90 transition text-center">
                            {hasWallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    onWallpaperChange(reader.result);
                                    onBackgroundTypeChange('wallpaper');
                                  }
                                };
                                reader.readAsDataURL(file);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>

                          {hasWallpaper && (
                            <button
                              onClick={() => onWallpaperChange('')}
                              className="px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[color:var(--ui-hover)] transition"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                      </>
                    )}

                    {backgroundType === 'solid' && (
                      <div className="flex items-center justify-center gap-3 rounded-lg p-2">
                        <div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {solidColorOptions.map((color) => {
                              const isDefault = color === 'default';
                              const isSelected = isDefault ? !wallpaperColor : wallpaperColor === color;
                              return (
                              <button
                                key={color}
                                onClick={() => {
                                  if (isDefault) {
                                    onWallpaperChange('');
                                    onWallpaperColorChange('');
                                    onBackgroundTypeChange('solid');
                                    return;
                                  }
                                  onWallpaperColorChange(color);
                                  onBackgroundTypeChange('solid');
                                }}
                                className={`relative h-6 w-6 rounded-full border transition ${
                                  isSelected
                                    ? 'border-[color:var(--ui-ring)] ring-2 ring-[color:var(--ui-ring)]'
                                    : 'border-[color:var(--ui-border)] hover:border-[color:var(--ui-ring)]'
                                }`}
                                style={{ backgroundColor: isDefault ? '#181716' : color }}
                                aria-label={
                                  isDefault
                                    ? 'Use default theme background'
                                    : `Choose ${color} background color`
                                }
                              >
                                {isSelected && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="h-1 w-1 rounded-full bg-white/90 shadow-sm ring-1 ring-black/20" />
                                  </span>
                                )}
                              </button>
                            );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SettingsGroup>
            </div>
          )}

          {activeSection === 'search' && (
            <div className="space-y-8">
              <SettingsGroup title="Default search engine">
                <div className="space-y-2">
                  {searchOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSearchEngineChange(option.id)}
                      className={`w-full rounded-xl px-4 py-3 text-left transition
                        ${
                          searchEngine === option.id
                            ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] shadow-sm'
                            : 'hover:bg-[color:var(--ui-hover)]'
                        }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          searchEngine === option.id
                            ? 'text-[color:var(--ui-accent-contrast)]'
                            : 'text-[color:var(--ui-text)]'
                        }`}
                      >
                        {option.label}
                      </div>
                      <div
                        className={`text-xs ${
                          searchEngine === option.id
                            ? 'text-[color:var(--ui-accent-contrast)]/80'
                            : 'text-[color:var(--ui-text-muted)]'
                        }`}
                      >
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>

                <div
                  className={`overflow-hidden transition-all ${
                    searchEngine === SearchEngine.CUSTOM
                      ? 'max-h-40 opacity-100 mt-4'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <input
                    type="text"
                    value={customSearchUrl}
                    onChange={(event) => onCustomSearchUrlChange(event.target.value)}
                    placeholder="https://example.com/search?q={query}"
                    spellCheck={false}
                    className="w-full rounded-xl bg-[color:var(--ui-surface)] px-3 py-2 text-sm text-[color:var(--ui-text)] placeholder:text-[color:var(--ui-text-subtle)]"
                  />
                  <div className="mt-2 text-xs text-[color:var(--ui-text-muted)]">
                    Use {'{query}'} as the placeholder.
                  </div>
                </div>
              </SettingsGroup>
            </div>
          )}

          {activeSection !== 'appearance' && activeSection !== 'search' && (
            <div className="text-sm text-[color:var(--ui-text-muted)]">
              This section is coming soon.
            </div>
          )}

          {/* Sticky Save Bar */}
          {hasUnsavedChanges && (
  <div className="pointer-events-none absolute bottom-6 right-6 z-10">
    <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-[color:var(--ui-surface-strong)] backdrop-blur px-4 py-2 shadow-sm">
      <span className="text-xs text-[color:var(--ui-text-muted)]">
        Unsaved changes
      </span>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="rounded-full px-4 py-1 text-xs font-semibold bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] hover:brightness-95"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
)}
          </section>
        </div>
      </div>
    </div>
  );
};
