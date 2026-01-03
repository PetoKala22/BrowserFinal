import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import { Plus } from 'lucide-react';
import { WidgetGrid } from './widgets/WidgetGrid';
import { widgetDefinitions, widgetList } from './widgets/widgetRegistry';
import type { WidgetInstance, WidgetType } from './widgets/widgetTypes';

const STORAGE_KEY = 'newtab-widgets-v1';

const DEFAULT_WIDGETS: WidgetInstance[] = [
  { id: 'widget-clock', type: 'clock' },
  { id: 'widget-notes', type: 'notes' }
];

const DEFAULT_LAYOUT: Layout[] = [
  {
    i: 'widget-clock',
    x: 0,
    y: 0,
    w: widgetDefinitions.clock.defaultSize.w,
    h: widgetDefinitions.clock.defaultSize.h,
    minW: widgetDefinitions.clock.minW,
    minH: widgetDefinitions.clock.minH,
    maxW: widgetDefinitions.clock.maxW,
    maxH: widgetDefinitions.clock.maxH,
    isResizable: widgetDefinitions.clock.isResizable
  },
  {
    i: 'widget-notes',
    x: 4,
    y: 0,
    w: widgetDefinitions.notes.defaultSize.w,
    h: widgetDefinitions.notes.defaultSize.h,
    minW: widgetDefinitions.notes.minW,
    minH: widgetDefinitions.notes.minH,
    maxW: widgetDefinitions.notes.maxW,
    maxH: widgetDefinitions.notes.maxH
  }
];

const normalizeLayout = (widgets: WidgetInstance[], layout: Layout[]) => {
  const layoutById = new Map(layout.map((item) => [item.i, item]));
  return widgets.map((widget) => {
    const def = widgetDefinitions[widget.type];
    const existing = layoutById.get(widget.id);
    if (existing) {
      return {
        ...existing,
        minW: def?.minW,
        minH: def?.minH,
        maxW: def?.maxW,
        maxH: def?.maxH,
        isResizable: def?.isResizable
      };
    }
    return {
      i: widget.id,
      x: 0,
      y: Infinity,
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      minW: def.minW,
      minH: def.minH,
      maxW: def.maxW,
      maxH: def.maxH,
      isResizable: def.isResizable
    };
  });
};

const loadWidgetState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        widgets: DEFAULT_WIDGETS,
        layout: DEFAULT_LAYOUT
      };
    }
    const parsed = JSON.parse(raw) as {
      widgets?: WidgetInstance[];
      layout?: Layout[];
    };
    const widgets = Array.isArray(parsed.widgets)
      ? parsed.widgets.filter((widget) => widgetDefinitions[widget.type])
      : DEFAULT_WIDGETS;
    const layout = Array.isArray(parsed.layout) ? parsed.layout : DEFAULT_LAYOUT;
    return {
      widgets,
      layout: normalizeLayout(widgets, layout)
    };
  } catch {
    return {
      widgets: DEFAULT_WIDGETS,
      layout: DEFAULT_LAYOUT
    };
  }
};

export const NewTabPage: React.FC = () => {
  const [{ widgets, layout }, setWidgetState] = useState(loadWidgetState);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const payload = {
      widgets,
      layout: layout.map(({ i, x, y, w, h, minW, minH }) => ({
        i,
        x,
        y,
        w,
        h,
        minW,
        minH
      }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [layout, widgets]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (pickerRef.current?.contains(target)) return;
      if (pickerButtonRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [pickerOpen]);

  const addWidget = useCallback((type: WidgetType) => {
    const definition = widgetDefinitions[type];
    const id = `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setWidgetState((prev) => {
      const nextWidgets = [...prev.widgets, { id, type }];
      const nextLayout = normalizeLayout(nextWidgets, [
        ...prev.layout,
        {
          i: id,
          x: 0,
          y: Infinity,
          w: definition.defaultSize.w,
          h: definition.defaultSize.h,
          minW: definition.minW,
          minH: definition.minH,
          maxW: definition.maxW,
          maxH: definition.maxH,
          isResizable: definition.isResizable
        }
      ]);
      return { widgets: nextWidgets, layout: nextLayout };
    });
  }, []);

  const clearWidgets = useCallback(() => {
    setWidgetState({ widgets: [], layout: [] });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgetState((prev) => {
      const nextWidgets = prev.widgets.filter((widget) => widget.id !== id);
      const nextLayout = normalizeLayout(
        nextWidgets,
        prev.layout.filter((item) => item.i !== id)
      );
      return { widgets: nextWidgets, layout: nextLayout };
    });
  }, []);

  const handleLayoutChange = useCallback((nextLayout: Layout[]) => {
    setWidgetState((prev) => ({
      widgets: prev.widgets,
      layout: normalizeLayout(prev.widgets, nextLayout)
    }));
  }, []);

  const hasWidgets = widgets.length > 0;
  const availableWidgets = useMemo(() => widgetList, []);

  return (
    <div className="w-full h-full text-[color:var(--ui-newtab-text)] relative overflow-hidden">
      {/* Background with visual detail (required for blur) */}
      <div className="absolute inset-0 bg-transparent" />

      <div className="absolute inset-0 pb-10">
        {hasWidgets ? (
          <WidgetGrid
            widgets={widgets}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={removeWidget}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-[color:var(--ui-newtab-text-muted)]">
            Add a widget to get started.
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 z-20">
        <button
          type="button"
          ref={pickerButtonRef}
          onClick={() => setPickerOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-text)] shadow-lg shadow-black/5 transition hover:bg-[color:var(--ui-hover)]"
        >
          <Plus className="h-4 w-4" />
          Edit
        </button>
      </div>

      {pickerOpen && (
        <div
          ref={pickerRef}
          className="absolute bottom-6 left-6 z-30 w-[min(520px,calc(100%-3rem))] rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ui-text-subtle)]">
              Widget Library
            </div>
            <button
              type="button"
              onClick={() => {
                clearWidgets();
                setPickerOpen(false);
              }}
              className="rounded-full border border-[color:var(--ui-border)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--ui-text-muted)] transition hover:text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)]"
            >
              Clear All
            </button>
          </div>
          <div className="p-3 space-y-2">
            {availableWidgets.map((widget) => (
              <button
                key={widget.type}
                type="button"
                onClick={() => {
                  addWidget(widget.type);
                  setPickerOpen(false);
                }}
                className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-[color:var(--ui-border)] hover:bg-[color:var(--ui-hover)]"
              >
                <div className="text-sm font-semibold text-[color:var(--ui-text)]">
                  {widget.title}
                </div>
                <div className="text-xs text-[color:var(--ui-text-muted)]">
                  {widget.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
