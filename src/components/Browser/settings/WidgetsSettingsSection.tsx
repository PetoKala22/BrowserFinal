import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuChevronDown, LuCloudSun, LuMapPin, LuSearch, LuX } from 'react-icons/lu';
import type { WeatherLocation } from '@/lib/types';
import { SettingsGroup } from './SettingsGroup';

const WEATHER_LOCATION_KEY = 'newtab-weather-location';
const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

const formatLocationLabel = ({ name, admin1, country }: GeocodingResult) =>
  [name, admin1, country].filter(Boolean).join(', ');

const loadSavedLocation = (): WeatherLocation | null => {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as WeatherLocation;
    return typeof parsed?.latitude === 'number' &&
      typeof parsed?.longitude === 'number' &&
      typeof parsed?.name === 'string'
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const saveLocationToStorage = (location: WeatherLocation) => {
  localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
};

export const WidgetsSettingsSection: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WeatherLocation | null>(null);

  useEffect(() => {
    setSelected(loadSavedLocation());
  }, []);

  const currentLabel = useMemo(
    () => selected?.name ?? 'Not set',
    [selected]
  );

  useEffect(() => {
    if (!expanded || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query.trim()
          )}&count=6&language=en&format=json`,
          { signal: controller.signal }
        );

        const data = await response.json();
        const items: GeocodingResult[] = Array.isArray(data?.results)
          ? data.results
          : [];

        const mapped = items.map((item) => ({
          name: formatLocationLabel(item),
          latitude: item.latitude,
          longitude: item.longitude
        }));

        setResults(mapped);
        if (mapped.length === 0) {
          setError('No results found.');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError('Search failed.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [expanded, query]);

  const handleSaveLocation = useCallback((location: WeatherLocation) => {
    saveLocationToStorage(location);
    setSelected(location);
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  const handleRemoveLocation = useCallback(() => {
    localStorage.removeItem(WEATHER_LOCATION_KEY);
    setSelected(null);
  }, []);

  return (
    <div className="space-y-8">
      <SettingsGroup title="Widgets" description="Manage per-widget preferences.">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-left transition hover:bg-[color:var(--ui-hover)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--ui-hover)] text-[color:var(--ui-text)]">
                <LuCloudSun size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--ui-text)]">
                  Weather
                </div>
                <div className="text-xs text-[color:var(--ui-text-muted)]">
                  Location: {currentLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[color:var(--ui-text-muted)]">
              {expanded ? 'Hide' : 'Edit'}
              <span className={`transition ${expanded ? 'rotate-180' : ''}`}>
                <LuChevronDown size={14} />
              </span>
            </div>
          </div>
        </button>

        {expanded && (
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ui-text-subtle)]">
                  <LuMapPin size={12} />
                  Saved location
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[color:var(--ui-text)]">
                      {selected?.name ?? 'Not set'}
                    </div>
                    <div className="text-xs text-[color:var(--ui-text-muted)]">
                      Used to personalize the weather widget.
                    </div>
                  </div>
                  {selected && (
                    <button
                      type="button"
                      onClick={handleRemoveLocation}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-hover)] hover:text-[color:var(--ui-text)] transition-colors"
                      title="Remove location"
                    >
                      <LuX size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ui-text-subtle)]">
                  <LuSearch size={12} />
                  Search location
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a city or region"
                  className="mt-3 w-full rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-3 py-2 text-sm text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              {loading && (
                <div className="text-xs text-[color:var(--ui-text-muted)]">
                  Searching...
                </div>
              )}

              {error && (
                <div className="text-xs text-[color:var(--ui-text-muted)]">
                  {error}
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((result) => {
                    const isSelected = selected?.name === result.name;
                    return (
                      <button
                        key={`${result.latitude}-${result.longitude}-${result.name}`}
                        type="button"
                        onClick={() => handleSaveLocation(result)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? 'border-[color:var(--ui-accent)] bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)]'
                            : 'border-transparent text-[color:var(--ui-text)] hover:border-[color:var(--ui-border)] hover:bg-[color:var(--ui-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <LuMapPin size={14} />
                            <span>{result.name}</span>
                          </div>
                          {isSelected && <LuCheck size={14} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SettingsGroup>
    </div>
  );
};
