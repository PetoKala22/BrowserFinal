import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  resetDevPanelState,
  updateDevPanelState,
  useDevPanelState
} from '@/lib/devPanelState';

const WEATHER_CODE_OPTIONS = [
  { code: 0, label: 'Clear' },
  { code: 1, label: 'Mostly clear' },
  { code: 2, label: 'Partly cloudy' },
  { code: 3, label: 'Overcast' },
  { code: 45, label: 'Fog' },
  { code: 51, label: 'Drizzle' },
  { code: 61, label: 'Rain' },
  { code: 71, label: 'Snow' },
  { code: 80, label: 'Showers' },
  { code: 95, label: 'Thunderstorm' }
];

const clampNumber = (value: string, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
};

export const DeveloperPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const state = useDevPanelState();

  const weatherOptions = useMemo(() => WEATHER_CODE_OPTIONS, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <>
      <div className="absolute bottom-6 right-6 z-20">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-text)] shadow-lg shadow-black/5 transition hover:bg-[color:var(--ui-hover)]"
        >
          Dev Panel
        </button>
      </div>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-6 right-6 z-30 w-[min(560px,calc(100%-3rem))] border border-[color:var(--ui-border)] bg-neutral-950"
        >
          <div className="flex items-center justify-between">
            <div className="text-[0.65rem] uppercase tracking-[0.35em] text-white p-2">
              Developer Panel
            </div>
            <button
              type="button"
              onClick={() => resetDevPanelState()}
              className="text-[0.6rem] uppercase tracking-[0.25em] text-white p-2"
            >
              Reset
            </button>
          </div>

          <div className="p-4 space-y-6">
            <div className="space-y-3 bg-[color:var(--ui-surface-subtle)] p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--ui-text-subtle)]">
                  Time of day
                </div>
                <ToggleSwitch
                  checked={state.time.enabled}
                  onChange={(enabled) =>
                    updateDevPanelState({
                      time: { enabled }
                    })
                  }
                  ariaLabel="Toggle time override"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Hour
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={23}
                      value={state.time.hour}
                      onChange={(event) =>
                        updateDevPanelState({
                          time: {
                            hour: clampNumber(event.target.value, 0, 23)
                          }
                        })
                      }
                      className="flex-1 accent-[color:var(--ui-accent)]"
                    />
                    <span className="w-10 bg-[color:var(--ui-surface)] px-2 py-1 text-center text-xs text-[color:var(--ui-text)]">
                      {state.time.hour.toString().padStart(2, '0')}
                    </span>
                  </div>
                </label>
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Minute
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={59}
                      value={state.time.minute}
                      onChange={(event) =>
                        updateDevPanelState({
                          time: {
                            minute: clampNumber(event.target.value, 0, 59)
                          }
                        })
                      }
                      className="flex-1 accent-[color:var(--ui-accent)]"
                    />
                    <span className="w-10 bg-[color:var(--ui-surface)] px-2 py-1 text-center text-xs text-[color:var(--ui-text)]">
                      {state.time.minute.toString().padStart(2, '0')}
                    </span>
                  </div>
                </label>
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Second
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={59}
                      value={state.time.second}
                      onChange={(event) =>
                        updateDevPanelState({
                          time: {
                            second: clampNumber(event.target.value, 0, 59)
                          }
                        })
                      }
                      className="flex-1 accent-[color:var(--ui-accent)]"
                    />
                    <span className="w-10 bg-[color:var(--ui-surface)] px-2 py-1 text-center text-xs text-[color:var(--ui-text)]">
                      {state.time.second.toString().padStart(2, '0')}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3 bg-[color:var(--ui-surface-subtle)] p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--ui-text-subtle)]">
                  Weather override
                </div>
                <ToggleSwitch
                  checked={state.weather.enabled}
                  onChange={(enabled) =>
                    updateDevPanelState({
                      weather: { enabled }
                    })
                  }
                  ariaLabel="Toggle weather override"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Location label
                  <input
                    type="text"
                    value={state.weather.location}
                    onChange={(event) =>
                      updateDevPanelState({
                        weather: { location: event.target.value }
                      })
                    }
                    className="mt-1 w-full bg-[color:var(--ui-surface)] px-3 py-2 text-sm text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)]"
                  />
                </label>
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Condition
                  <select
                    value={state.weather.code}
                    onChange={(event) =>
                      updateDevPanelState({
                        weather: {
                          code: clampNumber(event.target.value, 0, 99)
                        }
                      })
                    }
                    className="mt-1 w-full bg-[color:var(--ui-surface)] px-3 py-2 text-sm text-[color:var(--ui-text)] outline-none focus:ring-2 focus:ring-[color:var(--ui-ring)]"
                  >
                    {weatherOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label} ({option.code})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Temperature (°C)
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-50}
                      max={60}
                      value={state.weather.temperature}
                      onChange={(event) =>
                        updateDevPanelState({
                          weather: {
                            temperature: clampNumber(event.target.value, -50, 60)
                          }
                        })
                      }
                      className="flex-1 accent-[color:var(--ui-accent)]"
                    />
                    <span className="w-10 bg-[color:var(--ui-surface)] px-2 py-1 text-center text-xs text-[color:var(--ui-text)]">
                      {Math.round(state.weather.temperature)}
                    </span>
                  </div>
                </label>
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  High (°C)
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-50}
                      max={60}
                      value={state.weather.high}
                      onChange={(event) =>
                        updateDevPanelState({
                          weather: {
                            high: clampNumber(event.target.value, -50, 60)
                          }
                        })
                      }
                      className="flex-1 accent-[color:var(--ui-accent)]"
                    />
                    <span className="w-10 bg-[color:var(--ui-surface)] px-2 py-1 text-center text-xs text-[color:var(--ui-text)]">
                      {Math.round(state.weather.high)}
                    </span>
                  </div>
                </label>
                <label className="text-xs text-[color:var(--ui-text-muted)]">
                  Low (°C)
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-50}
                      max={60}
                      value={state.weather.low}
                      onChange={(event) =>
                        updateDevPanelState({
                          weather: {
                            low: clampNumber(event.target.value, -50, 60)
                          }
                        })
                      }
                      className="flex-1 accent-[color:var(--ui-accent)]"
                    />
                    <span className="w-10 rounded-md bg-[color:var(--ui-surface)] px-2 py-1 text-center text-xs text-[color:var(--ui-text)]">
                      {Math.round(state.weather.low)}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
