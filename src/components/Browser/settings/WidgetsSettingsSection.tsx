import React, { useEffect, useMemo, useState } from 'react';
import type { WeatherLocation } from '@/lib/types';
import { SettingsGroup } from './SettingsGroup';

const WEATHER_LOCATION_KEY = 'newtab-weather-location';

type GeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

const formatLocationLabel = (result: GeocodingResult) => {
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return parts.join(', ');
};

const loadSavedLocation = () => {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherLocation;
    if (!parsed?.name || typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
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

  const currentLabel = useMemo(() => {
    if (!selected) return 'Not set';
    return selected.name;
  }, [selected]);

  useEffect(() => {
    if (!expanded) return;
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const handle = window.setTimeout(() => {
      setLoading(true);
      fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query.trim()
        )}&count=6&language=en&format=json`
      )
        .then((res) => res.json())
        .then((data) => {
          const items = Array.isArray(data?.results) ? (data.results as GeocodingResult[]) : [];
          const mapped = items.map((item) => ({
            name: formatLocationLabel(item),
            latitude: item.latitude,
            longitude: item.longitude
          }));
          setResults(mapped);
          setError(mapped.length === 0 ? 'No results found.' : null);
        })
        .catch(() => {
          setError('Search failed.');
        })
        .finally(() => {
          setLoading(false);
        });
    }, 350);

    return () => window.clearTimeout(handle);
  }, [expanded, query]);

  const saveLocation = (location: WeatherLocation) => {
    localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
    setSelected(location);
    setQuery('');
    setResults([]);
    setError(null);
  };

  return (
    <div className="space-y-8">
      <SettingsGroup title="Widgets" description="Manage per-widget preferences.">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-3 text-left transition hover:bg-[color:var(--ui-hover)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ui-text)]">
                Weather
              </div>
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Location: {currentLabel}
              </div>
            </div>
            <div className="text-xs text-[color:var(--ui-text-muted)]">
              {expanded ? 'Hide' : 'Edit'}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] p-4 space-y-3">
            {selected && (
              <div className="text-xs text-[color:var(--ui-text-muted)]">
                Using: {selected.name}
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ui-text-subtle)]">
                Search location
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Start typing a city or region"
                className="mt-2 w-full rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-3 py-2 text-sm text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)]"
              />
            </div>

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
                {results.map((result) => (
                  <button
                    key={`${result.latitude}-${result.longitude}-${result.name}`}
                    type="button"
                    onClick={() => saveLocation(result)}
                    className="w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm text-[color:var(--ui-text)] transition hover:border-[color:var(--ui-border)] hover:bg-[color:var(--ui-hover)]"
                  >
                    {result.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </SettingsGroup>
    </div>
  );
};
