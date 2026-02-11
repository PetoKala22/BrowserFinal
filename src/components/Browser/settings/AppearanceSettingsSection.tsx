import React from 'react';
import { solidColorOptions, DEFAULT_WALLPAPER_COLOR } from '@/lib/appearance';
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
  onWallpaperBlurChange
}) => {
  const hasWallpaper = Boolean(wallpaper);
  const activeWallpaper =
    backgroundType === 'wallpaper' ? wallpaper : '';
  const activeColor =
    backgroundType === 'solid' ? wallpaperColor : '';

  return (
    <div className="space-y-6 overflow-x-hidden">
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
              <div className="relative isolate aspect-video overflow-hidden rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)]">
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
                      ? wallpaperColor === DEFAULT_WALLPAPER_COLOR
                      : wallpaperColor === color;

                    return (
                      <button
                        key={color}
                        onClick={() =>
                          onWallpaperColorChange(
                            isDefault ? DEFAULT_WALLPAPER_COLOR : color
                          )
                        }
                        className={`relative h-6 w-6 rounded-full border transition ${
                          isSelected
                            ? 'border-[color:var(--ui-ring)] ring-2 ring-[color:var(--ui-ring)]'
                            : 'border-[color:var(--ui-border)] hover:border-[color:var(--ui-ring)]'
                        }`}
                        style={{
                          backgroundColor: isDefault
                            ? DEFAULT_WALLPAPER_COLOR
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
    </div>
  );
};
