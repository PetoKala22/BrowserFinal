import React from 'react';
import { SearchEngine } from '@/lib/types';
import { SettingsGroup } from './SettingsGroup';

const searchEngineIcons: Partial<Record<SearchEngine, string>> = {
  [SearchEngine.GOOGLE]: new URL('../../../assets/Google.svg', import.meta.url).href,
  [SearchEngine.YAHOO]: new URL('../../../assets/Yahoo.svg', import.meta.url).href,
  [SearchEngine.DUCKDUCKGO]: new URL('../../../assets/DuckDuckGo.svg', import.meta.url).href,
  [SearchEngine.BING]: new URL('../../../assets/Bing.svg', import.meta.url).href
};

const searchOptions = [
  { id: SearchEngine.GOOGLE, label: 'Google', description: 'Fast results with broad coverage.' },
  { id: SearchEngine.YAHOO, label: 'Yahoo', description: 'Classic search with news integrations.' },
  { id: SearchEngine.DUCKDUCKGO, label: 'DuckDuckGo', description: 'Privacy-focused search.' },
  { id: SearchEngine.BING, label: 'Bing', description: 'Microsoft search experience.' },
  { id: SearchEngine.CUSTOM, label: 'Custom', description: 'Use a custom search URL.' }
];

interface SearchSettingsSectionProps {
  searchEngine: SearchEngine;
  onSearchEngineChange: (engine: SearchEngine) => void;
  customSearchUrl: string;
  onCustomSearchUrlChange: (url: string) => void;
}

export const SearchSettingsSection: React.FC<SearchSettingsSectionProps> = ({
  searchEngine,
  onSearchEngineChange,
  customSearchUrl,
  onCustomSearchUrlChange
}) => (
  <div className="space-y-8">
    <SettingsGroup title="Default search engine">
      <div className="space-y-2">
        {searchOptions.map((option) => {
          const icon = searchEngineIcons[option.id];
          return (
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
              <div className="flex items-start gap-3">
                {icon && (
                  <img
                    src={icon}
                    alt={`${option.label} icon`}
                    className="h-6 w-6 shrink-0"
                  />
                )}
                <div>
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
                </div>
              </div>
            </button>
          );
        })}
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
);
