import React, { useState } from 'react';
import { Layout, SearchEngine, Theme } from '@/lib/types';
import exampleLight from '@/assets/ExampleLight.png';
import exampleDark from '@/assets/ExampleDark.png';
import exampleSystem from '@/assets/ExampleSystem.png';

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  layout: Layout;
  onLayoutChange: (layout: Layout) => void;
  wallpaper: string;
  onWallpaperChange: (wallpaper: string) => void;
  wallpaperBlur: boolean;
  onWallpaperBlurChange: (blur: boolean) => void;
  searchEngine: SearchEngine;
  onSearchEngineChange: (engine: SearchEngine) => void;
  customSearchUrl: string;
  onCustomSearchUrlChange: (url: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}

const themeOptions = [
  { id: Theme.LIGHT, label: 'Light', description: 'Bright UI with light surfaces.' },
  { id: Theme.DARK, label: 'Dark', description: 'Dim UI optimized for low light.' },
  { id: Theme.SYSTEM, label: 'System', description: 'Match your OS setting.' }
];

const themePreviews: Record<Theme, string> = {
  [Theme.LIGHT]: exampleLight,
  [Theme.DARK]: exampleDark,
  [Theme.SYSTEM]: exampleSystem
};

const searchOptions = [
  { id: SearchEngine.GOOGLE, label: 'Google', description: 'Fast results with broad coverage.' },
  { id: SearchEngine.YAHOO, label: 'Yahoo', description: 'Classic search with news integrations.' },
  { id: SearchEngine.DUCKDUCKGO, label: 'DuckDuckGo', description: 'Privacy-focused search.' },
  { id: SearchEngine.BING, label: 'Bing', description: 'Microsoft search experience.' },
  { id: SearchEngine.CUSTOM, label: 'Custom', description: 'Use any search engine URL.' }
];

const layoutOptions = [
  {
    id: Layout.GENERIC,
    label: 'Generic',
    description: 'Standard layout with top tabs and left sidebar toggle.'
  },
  {
    id: Layout.SIDEBAR,
    label: 'Sidebar',
    description: 'Zen-style sidebar docked to the right.'
  }
];

type SettingsSection = 'general' | 'appearance' | 'search' | 'privacy' | 'advanced';

const settingsSections: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'search', label: 'Search engine' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'advanced', label: 'Advanced' }
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  theme,
  onThemeChange,
  layout,
  onLayoutChange,
  wallpaper,
  onWallpaperChange,
  wallpaperBlur,
  onWallpaperBlurChange,
  searchEngine,
  onSearchEngineChange,
  customSearchUrl,
  onCustomSearchUrlChange,
  hasUnsavedChanges,
  isSaving,
  onSave
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  return (
    <div className="h-full w-full bg-transparent text-neutral-900 dark:text-neutral-100">
      <div className="flex h-full gap-6 p-8">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 rounded-2xl border border-white/30 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-xl p-3">
          <div className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Settings
          </div>

          <nav className="mt-3 flex flex-col gap-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`rounded-lg px-3 py-2 text-sm text-left transition-colors
                  ${
                    activeSection === section.id
                      ? 'bg-white/70 text-neutral-900 dark:bg-neutral-800/70 dark:text-neutral-100'
                      : 'text-neutral-700 hover:bg-white/50 dark:text-neutral-300 dark:hover:bg-neutral-800/40'
                  }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="flex-1 rounded-2xl border border-white/30 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/30 dark:border-neutral-800/70 pb-4">
            <div>
              <div className="text-sm font-semibold">Settings</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                {activeSection}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
              </span>
              <button
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="rounded-full px-4 py-1 text-xs font-semibold transition-colors
                  enabled:bg-neutral-900 enabled:text-white enabled:hover:bg-neutral-800
                  disabled:bg-white/60 disabled:text-neutral-400
                  dark:enabled:bg-neutral-100 dark:enabled:text-neutral-900
                  dark:disabled:bg-neutral-800/70 dark:disabled:text-neutral-500"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Section Content */}
          <div className="mt-6 space-y-8">
            {activeSection === 'appearance' && (
              <div>
                <div className="mb-3 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Theme
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onThemeChange(option.id)}
                      className={`rounded-xl p-2 transition-colors
                        ${
                          theme === option.id
                            ? 'bg-white/80 dark:bg-neutral-800/70'
                            : 'hover:bg-white/60 dark:hover:bg-neutral-800/40'
                        }`}
                    >
                      <div className="aspect-[16/10] overflow-hidden rounded-lg">
                        <img
                          src={themePreviews[option.id]}
                          alt={option.label}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="mt-2 text-sm font-medium text-center">
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Layout
                  </div>

                  <div className="space-y-2">
                    {layoutOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => onLayoutChange(option.id)}
                        className={`w-full rounded-xl px-4 py-3 text-left transition-colors
                          ${
                            layout === option.id
                              ? 'bg-white/80 dark:bg-neutral-800/70'
                              : 'hover:bg-white/60 dark:hover:bg-neutral-800/40'
                          }`}
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Wallpaper
                  </div>

                  <div className="rounded-xl border border-white/30 dark:border-neutral-800/70 p-4 bg-white/70 dark:bg-neutral-950/60 backdrop-blur">
                    {wallpaper ? (
                      <div className="overflow-hidden rounded-lg border border-white/30 dark:border-neutral-800/70">
                        <div
                          className={`h-32 w-full bg-center bg-cover ${
                            wallpaperBlur ? 'blur-sm scale-105' : ''
                          }`}
                          style={{ backgroundImage: `url(${wallpaper})` }}
                        />
                      </div>
                    ) : (
                      <div className="h-32 rounded-lg border border-dashed border-white/40 dark:border-neutral-700/80 flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
                        No wallpaper selected
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-white/40 dark:border-neutral-800/70 px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-white/60 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors">
                        Upload wallpaper
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                onWallpaperChange(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => onWallpaperChange('')}
                        className="rounded-lg border border-white/40 dark:border-neutral-800/70 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-white/60 dark:hover:bg-neutral-800/60 transition-colors"
                      >
                        Remove
                      </button>

                      <label className="ml-auto inline-flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                        <input
                          type="checkbox"
                          checked={wallpaperBlur}
                          onChange={(event) => onWallpaperBlurChange(event.target.checked)}
                          className="h-4 w-4 accent-neutral-800 dark:accent-neutral-200"
                        />
                        Blur wallpaper
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'search' && (
              <div>
                <div className="mb-3 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Default search engine
                </div>

                <div className="space-y-2">
                  {searchOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSearchEngineChange(option.id)}
                      className={`w-full rounded-xl px-4 py-3 text-left transition-colors
                        ${
                          searchEngine === option.id
                            ? 'bg-white/80 dark:bg-neutral-800/70'
                            : 'hover:bg-white/60 dark:hover:bg-neutral-800/40'
                        }`}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>

                {searchEngine === SearchEngine.CUSTOM && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      Custom search URL
                    </div>
                    <input
                      type="text"
                      value={customSearchUrl}
                      onChange={(e) => onCustomSearchUrlChange(e.target.value)}
                      placeholder="https://example.com/search?q={query}"
                      spellCheck={false}
                      className="w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-sm
                        dark:border-neutral-800/70 dark:bg-neutral-950/70 backdrop-blur"
                    />
                    <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Use {'{query}'} as the placeholder.
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection !== 'appearance' && activeSection !== 'search' && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                This section is coming soon.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
