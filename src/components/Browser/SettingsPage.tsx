import React, { useState } from 'react';
import { SearchEngine, Theme } from '@/lib/types';
import exampleLight from '@/assets/ExampleLight.png';
import exampleDark from '@/assets/ExampleDark.png';
import exampleSystem from '@/assets/ExampleSystem.png';

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
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
    <div className="h-full w-full bg-neutral-100/70 dark:bg-neutral-900/60 text-neutral-800 dark:text-neutral-200">
      <div className="flex h-full gap-6 p-8">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0">
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
                      ? 'bg-neutral-200/70 text-neutral-900 dark:bg-neutral-800/70 dark:text-neutral-100'
                      : 'text-neutral-600 hover:bg-neutral-200/40 dark:text-neutral-400 dark:hover:bg-neutral-800/40'
                  }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <section className="flex-1 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/60 p-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200/70 dark:border-neutral-800/70 pb-4">
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
                  disabled:bg-neutral-200 disabled:text-neutral-400
                  dark:enabled:bg-neutral-100 dark:enabled:text-neutral-900
                  dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
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
                            ? 'bg-neutral-200/70 dark:bg-neutral-800/70'
                            : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40'
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
                            ? 'bg-neutral-200/70 dark:bg-neutral-800/70'
                            : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40'
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
                      className="w-full rounded-xl border border-neutral-200/70 bg-white px-3 py-2 text-sm
                        dark:border-neutral-800/70 dark:bg-neutral-900"
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
