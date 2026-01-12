import React, { useEffect, useState, memo } from 'react';
import { LuX } from 'react-icons/lu';
import { SearchEngine } from '@/lib/types';
import { IconButton } from '@/components/ui/IconButton';
import { AppearanceSettingsSection } from './settings/AppearanceSettingsSection';
import { SearchSettingsSection } from './settings/SearchSettingsSection';
import { PrivacySettingsSection } from './settings/PrivacySettingsSection';
import { GeneralSettingsSection } from './settings/GeneralSettingsSection';
import { AdvancedSettingsSection } from './settings/AdvancedSettingsSection';
import { WidgetsSettingsSection } from './settings/WidgetsSettingsSection';

type SettingsSection =
  | 'general'
  | 'appearance'
  | 'widgets'
  | 'search'
  | 'privacy'
  | 'advanced';

const settingsSections: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'widgets', label: 'Widgets' },
  { id: 'search', label: 'Search engine' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'advanced', label: 'Advanced' }
];

export const SettingsPage = memo<React.FC<any>>(({
  wallpaper,
  onWallpaperChange,
  wallpaperColor,
  onWallpaperColorChange,
  backgroundType,
  onBackgroundTypeChange,
  wallpaperBlur,
  onWallpaperBlurChange,
  adBlockEnabled,
  onAdBlockEnabledChange,
  permissions,
  onPermissionsChange,
  searchEngine,
  onSearchEngineChange,
  initialSection,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onClose,
  subsection
}) => {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(initialSection ?? 'appearance');

  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
  }, [initialSection]);

  return (
    <div className="h-full w-full overflow-hidden bg-[color:var(--ui-base)]">
      <div className="flex h-full p-8">
        <div className="flex h-full w-full gap-6 rounded-3xl bg-[color:var(--ui-surface)] shadow-lg p-4 overflow-hidden">

          {/* Sidebar */}
          <aside className="flex h-full w-[220px] shrink-0 flex-col p-3 overflow-hidden">
            <div className="text-xs uppercase tracking-wide text-[color:var(--ui-text-subtle)]">
              Settings
            </div>

            <nav className="mt-3 flex-1 overflow-y-auto space-y-1 pr-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`relative w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm font-medium'
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
          <section className="relative flex h-full flex-1 flex-col rounded-3xl bg-[color:var(--ui-surface-strong)] shadow-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--ui-border)] px-6 py-4">
              <div>
                <div className="text-sm font-semibold text-[color:var(--ui-text)]">
                  Settings
                </div>
                <div className="text-xs capitalize text-[color:var(--ui-text-muted)]">
                  {activeSection}
                </div>
              </div>
              <IconButton onClick={onClose}>
                <LuX size={16} />
              </IconButton>
            </div>

            {/* Scrollable Content */}
            <div className="relative flex-1 overflow-y-auto px-6 py-6 pb-28">
              {activeSection === 'appearance' && (
                <AppearanceSettingsSection
                  wallpaper={wallpaper}
                  onWallpaperChange={onWallpaperChange}
                  wallpaperColor={wallpaperColor}
                  onWallpaperColorChange={onWallpaperColorChange}
                  backgroundType={backgroundType}
                  onBackgroundTypeChange={onBackgroundTypeChange}
                  wallpaperBlur={wallpaperBlur}
                  onWallpaperBlurChange={onWallpaperBlurChange}
                />
              )}

              {activeSection === 'search' && (
                <SearchSettingsSection
                  searchEngine={searchEngine}
                  onSearchEngineChange={onSearchEngineChange}
                />
              )}

              {activeSection === 'privacy' && (
                <PrivacySettingsSection
                  adBlockEnabled={adBlockEnabled}
                  onAdBlockEnabledChange={onAdBlockEnabledChange}
                  permissions={permissions}
                  onPermissionsChange={onPermissionsChange}
                />
              )}

              {activeSection === 'general' && <GeneralSettingsSection />}
              {activeSection === 'widgets' && <WidgetsSettingsSection />}
              {activeSection === 'advanced' && <AdvancedSettingsSection />}
            </div>

            {/* Sticky Save Bar */}
            {hasUnsavedChanges && (
              <div className="pointer-events-none absolute bottom-6 right-6 z-10">
                <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-[color:var(--ui-surface-strong)] px-4 py-2 shadow-sm backdrop-blur">
                  <span className="text-xs text-[color:var(--ui-text-muted)]">
                    Unsaved changes
                  </span>
                  <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="rounded-full bg-[color:var(--ui-accent)] px-4 py-1 text-xs font-semibold text-[color:var(--ui-accent-contrast)] hover:brightness-95"
                  >
                    {isSaving ? 'Saving' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
});

SettingsPage.displayName = 'SettingsPage';
