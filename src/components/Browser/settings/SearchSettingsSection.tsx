import React, { useEffect } from 'react';
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
  { id: SearchEngine.BING, label: 'Bing', description: 'Microsoft search experience.' }
];

interface SearchSettingsSectionProps {
  searchEngine: SearchEngine;
  onSearchEngineChange: (engine: SearchEngine) => void;
}

export const SearchSettingsSection: React.FC<SearchSettingsSectionProps> = ({
  searchEngine,
  onSearchEngineChange
}) => {
  useEffect(() => {
    if (searchEngine === SearchEngine.CUSTOM) {
      onSearchEngineChange(SearchEngine.GOOGLE);
    }
  }, [searchEngine, onSearchEngineChange]);

  return (
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
      </SettingsGroup>
    </div>
  );
};
