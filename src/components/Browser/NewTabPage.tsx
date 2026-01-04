import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import { WidgetGrid } from './widgets/WidgetGrid';
import { WidgetLibrary } from './widgets/WidgetLibrary';
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

const findNextPosition = (layout: Layout[], size: { w: number; h: number }, cols: number) => {
  const maxY = layout.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);
  const fits = (x: number, y: number) =>
    layout.every((item) => {
      const overlapX = x < item.x + item.w && x + size.w > item.x;
      const overlapY = y < item.y + item.h && y + size.h > item.y;
      return !(overlapX && overlapY);
    });

  for (let y = 0; y <= maxY + 50; y += 1) {
    for (let x = 0; x <= cols - size.w; x += 1) {
      if (fits(x, y)) {
        return { x, y };
      }
    }
  }

  return { x: 0, y: maxY + 1 };
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
  const saveTimerRef = useRef<number | null>(null);
  const layoutFrameRef = useRef<number | null>(null);
  const pendingLayoutRef = useRef<Layout[] | null>(null);

  useEffect(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
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
    }, 250);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [layout, widgets]);

  useEffect(() => {
    return () => {
      if (layoutFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutFrameRef.current);
      }
    };
  }, []);

  const addWidget = useCallback((type: WidgetType) => {
    const definition = widgetDefinitions[type];
    const id = `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setWidgetState((prev) => {
      const position = findNextPosition(
        prev.layout,
        { w: definition.defaultSize.w, h: definition.defaultSize.h },
        24
      );
      const nextWidgets = [...prev.widgets, { id, type }];
      const nextLayout = normalizeLayout(nextWidgets, [
        ...prev.layout,
        {
          i: id,
          x: position.x,
          y: position.y,
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
    pendingLayoutRef.current = nextLayout;
    if (layoutFrameRef.current !== null) return;
    layoutFrameRef.current = window.requestAnimationFrame(() => {
      layoutFrameRef.current = null;
      const pending = pendingLayoutRef.current;
      if (!pending) return;
      setWidgetState((prev) => ({
        widgets: prev.widgets,
        layout: pending
      }));
    });
  }, []);

  const handleLayoutCommit = useCallback((nextLayout: Layout[]) => {
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
            onLayoutCommit={handleLayoutCommit}
            onRemoveWidget={removeWidget}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-[color:var(--ui-newtab-text-muted)]">
            <div className="text-center space-y-1">
              <div>Add a widget to get started.</div>
              <div>Use the Edit button to open the library.</div>
            </div>
          </div>
        )}
      </div>

      <WidgetLibrary
        availableWidgets={availableWidgets}
        onAddWidget={addWidget}
        onClearWidgets={clearWidgets}
      />
    </div>
  );
};
