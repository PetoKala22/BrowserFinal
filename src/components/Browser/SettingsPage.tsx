import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Layout, SearchEngine } from '@/lib/types';
import { IconButton } from '@/components/ui/IconButton';

interface SettingsPageProps {
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

const layoutOptions = [
  { id: Layout.GENERIC, label: 'Generic' },
  { id: Layout.SIDEBAR, label: 'Sidebar' }
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
  onSave,
  onClose
}) => {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('appearance');

  return (
    <div className="h-full w-full">
      <div className="flex h-full gap-6 p-8">

        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 rounded-2xl bg-[color:var(--ui-surface)] backdrop-blur-xl p-3">
          <div className="text-xs uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
            Settings
          </div>

          <nav className="mt-3 flex flex-col gap-1">
            {settingsSections.map(section => (
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
        <section className="relative flex-1 rounded-2xl bg-[color:var(--ui-surface-strong)] backdrop-blur-xl p-6 overflow-y-auto">
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

              {/* Layout */}
              <SettingsGroup title="Layout">
                <div className="inline-flex rounded-xl bg-[color:var(--ui-surface)] p-1">
                  {layoutOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => onLayoutChange(option.id)}
                      className={`px-4 py-2 rounded-lg text-sm transition
                        ${
                          layout === option.id
                            ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)]'
                            : 'text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)]'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </SettingsGroup>

              {/* Wallpaper */}
              <SettingsGroup title="Wallpaper">
                <div className="rounded-xl p-4 bg-[color:var(--ui-surface)]">
                  {wallpaper ? (
                    <div className="overflow-hidden rounded-lg">
                      <div
                        className={`h-24 w-full bg-cover bg-center transition ${
                          wallpaperBlur ? 'blur-sm scale-105' : ''
                        }`}
                        style={{ backgroundImage: `url(${wallpaper})` }}
                      />
                    </div>
                  ) : (
                    <div className="h-24 rounded-lg bg-[color:var(--ui-surface-subtle)] flex items-center justify-center text-xs text-[color:var(--ui-text-muted)]">
                      No wallpaper selected
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <label className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-[color:var(--ui-hover)]">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => {
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

                    <button
                      onClick={() => onWallpaperChange('')}
                      className="rounded-lg px-3 py-2 text-xs hover:bg-[color:var(--ui-hover)]"
                    >
                      Remove
                    </button>

                    <button
                      onClick={() => onWallpaperBlurChange(!wallpaperBlur)}
                      className={`ml-auto rounded-full px-3 py-1 text-xs transition
                        ${
                          wallpaperBlur
                            ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)]'
                            : 'bg-[color:var(--ui-surface-muted)]'
                        }`}
                    >
                      Blur
                    </button>
                  </div>
                </div>
              </SettingsGroup>
            </div>
          )}

          {activeSection === 'search' && (
            <div className="space-y-8">
              <SettingsGroup title="Default search engine">
                <div className="space-y-2">
                  {searchOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => onSearchEngineChange(option.id)}
                      className={`w-full rounded-xl px-4 py-3 text-left transition
                        ${
                          searchEngine === option.id
                            ? 'bg-[color:var(--ui-surface-strong)]'
                            : 'hover:bg-[color:var(--ui-hover)]'
                        }`}
                    >
                      <div className="text-sm font-medium text-[color:var(--ui-text)]">
                        {option.label}
                      </div>
                      <div className="text-xs text-[color:var(--ui-text-muted)]">
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
                    onChange={e => onCustomSearchUrlChange(e.target.value)}
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
            <div className="sticky bottom-4 mt-10 flex justify-end">
              <div className="flex items-center gap-3 rounded-full bg-[color:var(--ui-surface-strong)] backdrop-blur px-4 py-2 shadow-sm">
                <span className="text-xs text-[color:var(--ui-text-muted)]">
                  Unsaved changes
                </span>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="rounded-full px-4 py-1 text-xs font-semibold bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] hover:brightness-95"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
